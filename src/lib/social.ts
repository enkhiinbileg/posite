import { toast } from "sonner";

const FB_PAGE_ID = process.env.META_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;

interface SocialPostResult {
    success: boolean;
    error?: string;
    postId?: string;
}

export async function postToFacebook(message: string, imageUrl?: string, scheduledTime?: number): Promise<SocialPostResult> {
    if (!FB_PAGE_ID || !FB_ACCESS_TOKEN) {
        console.error("Missing Facebook Credentials");
        return { success: false, error: "Missing Credentials" };
    }

    try {
        const url = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/photos`;

        // Base params
        const params = new URLSearchParams({
            access_token: FB_ACCESS_TOKEN,
            url: imageUrl || '',
            caption: message,
            published: scheduledTime ? 'false' : 'true'
        });

        // Add scheduling if provided
        if (scheduledTime) {
            params.append('scheduled_publish_time', scheduledTime.toString());
        }

        // If no image, switch to /feed endpoint
        const endpoint = imageUrl ? url : `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`;
        if (!imageUrl) {
            params.delete('url');
            params.set('message', message);
        }

        const response = await fetch(`${endpoint}?${params.toString()}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.error) {
            console.error("Facebook API Error:", data.error);
            return { success: false, error: data.error.message };
        }

        return { success: true, postId: data.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export interface FBPost {
    id: string;
    message?: string;
    full_picture?: string;
    created_time: string;
    permalink_url: string;
}

export async function getFacebookPosts(limit = 10): Promise<{ success: boolean; data?: FBPost[]; error?: string }> {
    if (!FB_PAGE_ID || !FB_ACCESS_TOKEN) {
        return { success: false, error: "Missing Credentials" };
    }

    try {
        const fields = "id,message,full_picture,created_time,permalink_url";
        const url = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed?fields=${fields}&limit=${limit}&access_token=${FB_ACCESS_TOKEN}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Facebook API Error:", data.error);
            return { success: false, error: data.error.message };
        }

        return { success: true, data: data.data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteFacebookPost(postId: string): Promise<{ success: boolean; error?: string }> {
    if (!FB_ACCESS_TOKEN) return { success: false, error: "Missing Token" };

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${postId}?access_token=${FB_ACCESS_TOKEN}`, {
            method: 'DELETE',
        });
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateFacebookPost(postId: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!FB_ACCESS_TOKEN) return { success: false, error: "Missing Token" };

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${postId}?message=${encodeURIComponent(message)}&access_token=${FB_ACCESS_TOKEN}`, {
            method: 'POST', // Graph API uses POST for updates
        });
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// Note: Instagram Posting via API is complex (Container -> Publish).
// For simplicity V1, we will focus on FB.
// If specific IG support is needed, we need "instagram_basic" and "instagram_content_publish" permissions.
