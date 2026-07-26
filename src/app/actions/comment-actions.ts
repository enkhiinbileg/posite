"use server";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function deleteCommentAdminAction(commentId: string | number) {
    try {
        const client = await createClient();
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (authError || !user) {
            return { success: false, error: "Нэвтрээгүй байна." };
        }

        // Fetch user profile to verify role
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("is_admin, is_moderator")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            return { success: false, error: "Хэрэглэгчийн мэдээлэл олдсонгүй." };
        }

        const isAuthorized = profile.is_admin || profile.is_moderator;
        if (!isAuthorized) {
            return { success: false, error: "Энэ үйлдлийг хийх эрх хүрэлцэхгүй байна." };
        }

        // Delete the comment using admin client (bypassing RLS)
        const { error: deleteError } = await supabaseAdmin
            .from("comments")
            .delete()
            .eq("id", commentId);

        if (deleteError) {
            throw deleteError;
        }

        // Revalidate admin comments page
        revalidatePath("/admin/comments");

        return { success: true };
    } catch (err: any) {
        console.error("deleteCommentAdminAction error:", err);
        return { success: false, error: err.message };
    }
}
