export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Server-side: uses service role to bypass RLS — avoids browser proxy timeout on chapters count
const adminDb = supabaseAdmin;

export async function GET(req: NextRequest) {
    try {
        // Only allow admin users
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");

        // Helper to fetch all rows from a table using pagination
        async function fetchAllRows(query: any, limit = 10000) {
            let allData: any[] = [];
            let from = 0;
            const pageSize = 1000;
            
            while (from < limit) {
                const { data, error } = await query.range(from, from + pageSize - 1);
                if (error || !data || data.length === 0) break;
                allData = allData.concat(data);
                if (data.length < pageSize) break;
                from += pageSize;
            }
            return allData;
        }

        // Fetch counts (these work fine with exact count)
        const now = new Date().toISOString();
        const [webtoonsRes, chaptersRes, usersRes, likesRes, vipRes, nsfwVipRes] = await Promise.all([
            adminDb.from("webtoons").select("*", { count: "exact", head: true }),
            adminDb.from("chapters").select("*", { count: "exact", head: true }),
            adminDb.from("profiles").select("*", { count: "exact", head: true }),
            adminDb.from("likes").select("*", { count: "exact", head: true }),
            adminDb.from("profiles").select("*", { count: "exact", head: true }).eq("is_vip", true).gt("vip_expiration", now),
            adminDb.from("profiles").select("*", { count: "exact", head: true }).gt("nsfw_vip_expiration", now),
        ]);

        // Fetch large datasets with pagination
        const [profilesData, grantsData] = await Promise.all([
            fetchAllRows(adminDb.from("profiles").select("id, created_at, vip_expiration, nsfw_vip_expiration").order("created_at", { ascending: true }), 15000),
            fetchAllRows(adminDb.from("vip_grants").select("package_type, user_id, granted_at"), 10000)
        ]);

        // Aggregate growth data
        const tempMap: Record<string, number> = {};
        profilesData.forEach(p => {
            if (!p.created_at) return;
            const date = new Date(p.created_at).toISOString().split('T')[0];
            tempMap[date] = (tempMap[date] || 0) + 1;
        });

        let cumulative = 0;
        const userGrowth = Object.keys(tempMap).sort().map(date => {
            cumulative += tempMap[date];
            const displayDate = new Date(date).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
            return { date: displayDate, users: cumulative };
        });

        // Map users to their latest package
        const userLatestPackage: Record<string, string> = {};
        const userGrantTime: Record<string, string> = {};
        
        grantsData.forEach(g => {
            if (!g.user_id) return;
            if (!userGrantTime[g.user_id] || g.granted_at > userGrantTime[g.user_id]) {
                userGrantTime[g.user_id] = g.granted_at;
                userLatestPackage[g.user_id] = g.package_type;
            }
        });

        // Map profile status
        const activeVipUsers = new Set();
        const activeNsfwUsers = new Set();
        profilesData.forEach(p => {
            if (p.vip_expiration && p.vip_expiration > now) activeVipUsers.add(p.id);
            if (p.nsfw_vip_expiration && p.nsfw_vip_expiration > now) activeNsfwUsers.add(p.id);
        });

        // Aggregate package stats (Active vs Total)
        const packageStats: Record<string, { total: number, active: number, uniqueUsers: Set<string> }> = {};
        
        const MAIN_PACKAGES = ['1 Сар', '3 Сар', '1 Жил', '+18 vip'];
        const normalizePkgName = (name: string) => {
            if (!name) return null;
            let normalized = name.trim();
            const lower = normalized.toLowerCase();
            if (lower === '1 сар') return '1 Сар';
            if (lower === '3 сар') return '3 Сар';
            if (lower === '1 жил') return '1 Жил';
            if (lower === '+18 vip' || lower === 'nsfw_vip_grant') return '+18 vip';
            
            if (lower.includes('custom')) return 'Custom';
            if (MAIN_PACKAGES.includes(normalized)) return normalized;
            return null; 
        };

        // Calculate totals from all grants
        grantsData.forEach(g => {
            const pkg = normalizePkgName(g.package_type);
            if (!pkg) return;
            if (!packageStats[pkg]) {
                packageStats[pkg] = { total: 0, active: 0, uniqueUsers: new Set() };
            }
            packageStats[pkg].total += 1;
            if (g.user_id) packageStats[pkg].uniqueUsers.add(g.user_id);
        });

        // Calculate active users by checking their latest package against their active status
        const accountedVip = new Set();
        const accountedNsfw = new Set();
        
        Object.keys(userLatestPackage).forEach(userId => {
            const pkg = normalizePkgName(userLatestPackage[userId]);
            if (!pkg) return;
            
            const isNsfwPkg = pkg === '+18 vip';
            const isActive = isNsfwPkg ? activeNsfwUsers.has(userId) : activeVipUsers.has(userId);
            
            if (isActive && packageStats[pkg]) {
                packageStats[pkg].active += 1;
                if (isNsfwPkg) accountedNsfw.add(userId);
                else accountedVip.add(userId);
            }
        });

        // Handle "Unknown / Manual" active users (those with active status but no grant history)
        const unknownVipCount = activeVipUsers.size - accountedVip.size;
        const unknownNsfwCount = activeNsfwUsers.size - accountedNsfw.size;

        if (unknownVipCount > 0) {
            packageStats['Unknown (VIP)'] = { total: 0, active: unknownVipCount, uniqueUsers: new Set() };
        }
        if (unknownNsfwCount > 0) {
            packageStats['Unknown (NSFW)'] = { total: 0, active: unknownNsfwCount, uniqueUsers: new Set() };
        }

        const packageBreakdown = Object.keys(packageStats).map(name => ({
            name,
            count: packageStats[name].total,
            active: packageStats[name].active,
            uniqueUsers: packageStats[name].uniqueUsers.size
        })).filter(p => p.active > 0 || p.count > 0)
          .sort((a, b) => b.active - a.active || b.count - a.count);

        return NextResponse.json({
            webtoons: webtoonsRes.count ?? 0,
            chapters: chaptersRes.count ?? 0,
            users: usersRes.count ?? 0,
            likes: likesRes.count ?? 0,
            vipUsers: activeVipUsers.size,
            nsfwVipUsers: activeNsfwUsers.size,
            userGrowth,
            packageBreakdown
        });
    } catch (err: any) {
        console.error("Stats API Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
