'use server'

import { getFacebookPosts, postToFacebook } from "@/lib/social";
import { revalidatePath } from "next/cache";

export async function fetchSocialPosts() {
    return await getFacebookPosts(10);
}

export async function publishSocialPost(prevState: any, formData: FormData) {
    const message = formData.get("message") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const scheduledTimeRaw = formData.get("scheduledTime") as string;

    if (!message) {
        return { success: false, message: "Caption is required" };
    }

    let scheduledTime: number | undefined;
    if (scheduledTimeRaw) {
        // Form sends ISO string or timestamp. Let's assume input type="datetime-local" which sends 'YYYY-MM-DDTHH:mm'
        // We need unix timestamp in seconds.
        const date = new Date(scheduledTimeRaw);
        const now = new Date();
        const minTime = new Date(now.getTime() + 10 * 60000); // Now + 10 mins

        if (date < minTime) {
            return { success: false, message: "Scheduled time must be at least 10 minutes in the future." };
        }

        scheduledTime = Math.floor(date.getTime() / 1000);
    }

    console.log("Publishing to FB:", { message, imageUrl, scheduledTime });

    const result = await postToFacebook(message, imageUrl, scheduledTime);

    if (result.success) {
        revalidatePath("/admin/social");
        return { success: true, message: scheduledTime ? "Post scheduled successfully!" : "Published successfully!" };
    } else {
        return { success: false, message: result.error || "Failed to publish" };
    }
}

export async function deleteSocialPostAction(postId: string) {
    const result = await import("@/lib/social").then(m => m.deleteFacebookPost(postId));
    revalidatePath("/admin/social");
    return result;
}

export async function updateSocialPostAction(postId: string, message: string) {
    const result = await import("@/lib/social").then(m => m.updateFacebookPost(postId, message));
    revalidatePath("/admin/social");
    return result;
}
