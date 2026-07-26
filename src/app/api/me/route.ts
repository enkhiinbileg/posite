export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Server-side route: uses service role to bypass RLS + proxy JWT issues
const adminDb = supabaseAdmin;

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        // Verify token and get user
        const { data: { user }, error: userError } = await adminDb.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Get profile using service role (bypasses RLS completely)
        const { data: profile, error: profileError } = await adminDb
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        let userProfile = profile || {
            id: user.id,
            username: user.email?.split('@')[0] || 'User',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
            is_admin: false,
            is_vip: false,
            is_moderator: false
        };

        // Ensure target admin email gets Admin & VIP status
        if (user.email === 'erka050719@gmail.com') {
            userProfile.is_admin = true;
            userProfile.is_vip = true;
            userProfile.is_moderator = true;
            
            // Persist to profiles DB table
            await adminDb
                .from('profiles')
                .upsert({
                    id: user.id,
                    username: userProfile.username || 'erka050719',
                    full_name: userProfile.full_name || 'Erka Admin',
                    avatar_url: userProfile.avatar_url,
                    is_admin: true,
                    is_vip: true,
                    is_moderator: true
                });
        }

        return NextResponse.json(userProfile);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
