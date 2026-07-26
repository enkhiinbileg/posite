"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath, revalidateTag } from "next/cache";

export async function getVideosAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from('videos')
            .select('*, webtoons(title, image)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("getVideosAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getVideosGroupedByWebtoonAction() {
    try {
        console.log("Fetching videos...");
        const { data: videos, error } = await supabaseAdmin
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Error:", error);
            return { success: true, data: [] };
        }
        
        if (!videos || videos.length === 0) {
            return { success: true, data: [] };
        }

        const groupedData = [{
            id: 'standalone',
            title: 'Сүүлд нэмэгдсэн бичлэгүүд',
            image: '/logo.png',
            genres: ['Бүх видео'],
            videos: videos
        }];
        
        return { success: true, data: groupedData };
    } catch (error: any) {
        console.error("getVideosGroupedByWebtoonAction Error:", error);
        return { success: true, data: [] };
    }
}


export async function getVideoDetailAction(id: string, userId?: string) {
    try {
        const { data: video, error: videoError } = await supabaseAdmin
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (videoError) throw videoError;

        let hasAccess = video.is_free;
        let accessData = null;

        if (!hasAccess && userId) {
            const { data: access, error: accessError } = await supabaseAdmin
                .from('video_access')
                .select('*')
                .eq('user_id', userId)
                .eq('video_id', id)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .maybeSingle();

            if (access) {
                hasAccess = true;
                accessData = access;
            }
        }

        // Fetch related videos from the same webtoon
        let relatedVideos: any[] = [];
        if (video.webtoon_id) {
            const { data: related } = await supabaseAdmin
                .from('videos')
                .select('*')
                .eq('webtoon_id', video.webtoon_id)
                .neq('id', id)
                .order('order_index', { ascending: true });
            
            relatedVideos = related || [];
        }

        return { 
            success: true, 
            data: { 
                ...video, 
                hasAccess, 
                accessData,
                relatedVideos 
            } 
        };
    } catch (error: any) {
        console.error("getVideoDetailAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function createVideoAction(data: any) {
    try {
        const { data: createdVideo, error } = await supabaseAdmin
            .from('videos')
            .insert(data)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/videos");
        revalidatePath("/admin/videos");
        return { success: true, data: createdVideo };
    } catch (error: any) {
        console.error("createVideoAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteVideoAction(id: string) {
    try {
        // 1. Delete related records in video_access first
        await supabaseAdmin
            .from('video_access')
            .delete()
            .eq('video_id', id);

        // 2. Delete related records in payments
        await supabaseAdmin
            .from('payments')
            .delete()
            .eq('video_id', id);

        // 3. Now delete the video
        const { error } = await supabaseAdmin
            .from('videos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath("/videos");
        revalidatePath("/admin/videos");
        return { success: true };
    } catch (error: any) {
        console.error("deleteVideoAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateVideoAction(id: string, data: any) {
    try {
        const { data: updatedVideo, error } = await supabaseAdmin
            .from('videos')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/videos");
        revalidatePath(`/videos/${id}`);
        revalidatePath("/admin/videos");
        return { success: true, data: updatedVideo };
    } catch (error: any) {
        console.error("updateVideoAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function createManualPaymentRequestAction(data: { userId: string, videoId: string, amount: number, accessType: string }) {
    try {
        const { data: payment, error } = await supabaseAdmin
            .from('payments')
            .insert([{
                user_id: data.userId,
                video_id: data.videoId,
                amount: data.amount,
                access_type: data.accessType,
                status: 'pending',
                payment_method: 'manual'
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: payment };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPendingPaymentsAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from('payments')
            .select('*, profiles(full_name, email), videos(title)')
            .eq('status', 'pending')
            .eq('payment_method', 'manual')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function approvePaymentAction(paymentId: string) {
    try {
        // 1. Get payment details
        const { data: payment, error: pError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (pError || !payment) throw new Error("Payment not found");

        // 2. Get video details for duration
        const { data: video } = await supabaseAdmin
            .from('videos')
            .select('*')
            .eq('id', payment.video_id)
            .single();

        if (!video) throw new Error("Video not found");

        // 3. Calculate expiration
        let expiresAt: string | null = null;
        if (payment.access_type === 'rental') {
            const expDate = new Date();
            expDate.setHours(expDate.getHours() + (video.rental_duration_hours || 24));
            expiresAt = expDate.toISOString();
        }

        // 4. Grant access
        const { error: accessError } = await supabaseAdmin
            .from('video_access')
            .insert({
                user_id: payment.user_id,
                video_id: payment.video_id,
                access_type: payment.access_type,
                expires_at: expiresAt,
                payment_id: payment.id
            });

        if (accessError) throw accessError;

        // 5. Mark payment as completed
        await supabaseAdmin
            .from('payments')
            .update({ status: 'completed' })
            .eq('id', paymentId);

        revalidatePath("/admin/payments");
        return { success: true };
    } catch (error: any) {
        console.error("approvePaymentAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function grantVideoAccessAction(userId: string, videoId: string, accessType: 'rental' | 'purchase') {
    try {
        // 1. Get video details
        const { data: video } = await supabaseAdmin
            .from('videos')
            .select('*')
            .eq('id', videoId)
            .single();

        if (!video) throw new Error("Video not found");

        // 2. Calculate expiration
        let expiresAt: string | null = null;
        if (accessType === 'rental') {
            const expDate = new Date();
            expDate.setHours(expDate.getHours() + (video.rental_duration_hours || 24));
            expiresAt = expDate.toISOString();
        }

        // 3. Grant access
        const { error: accessError } = await supabaseAdmin
            .from('video_access')
            .insert({
                user_id: userId,
                video_id: videoId,
                access_type: accessType,
                expires_at: expiresAt
            });

        if (accessError) throw accessError;

        revalidatePath(`/videos/${videoId}`);
        return { success: true };
    } catch (error: any) {
        console.error("grantVideoAccessAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getAllVideosAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from('videos')
            .select('id, title')
            .order('title', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUserVideoAccessAction(userId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('video_access')
            .select('*, videos(title)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("getUserVideoAccessAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function revokeVideoAccessAction(accessId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('video_access')
            .delete()
            .eq('id', accessId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("revokeVideoAccessAction Error:", error);
        return { success: false, error: error.message };
    }
}
