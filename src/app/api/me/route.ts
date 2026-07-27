export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generate8DigitId } from "@/lib/user-id";

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

        const numeric8DigitId = (profile?.unique_id && /^\d{8}$/.test(profile.unique_id))
            ? profile.unique_id
            : generate8DigitId(user.id);

        let userProfile = profile || {
            id: user.id,
            unique_id: numeric8DigitId,
            username: user.email?.split('@')[0] || 'User',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
            is_admin: false,
            is_vip: false,
            is_moderator: false
        };

        userProfile.unique_id = numeric8DigitId;

        // Ensure target admin email gets Admin & VIP status
        if (user.email === 'erka050719@gmail.com') {
            userProfile.is_admin = true;
            userProfile.is_vip = true;
            userProfile.is_moderator = true;
        }

        // Auto-persist 8-digit numeric ID to DB for existing & new users
        if (!profile || profile.unique_id !== numeric8DigitId) {
            await adminDb
                .from('profiles')
                .upsert({
                    id: user.id,
                    unique_id: numeric8DigitId,
                    username: userProfile.username || 'User',
                    full_name: userProfile.full_name || 'User',
                    avatar_url: userProfile.avatar_url,
                    is_admin: userProfile.is_admin,
                    is_vip: userProfile.is_vip,
                    is_moderator: userProfile.is_moderator
                });
        }

        return NextResponse.json(userProfile);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
