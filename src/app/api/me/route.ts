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

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        return NextResponse.json(profile);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
