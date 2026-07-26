import { getNsfwWebtoonsCached } from "@/lib/queries";
import { SecretClient } from "@/components/secret/SecretClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { fetchLatestUpdatesAction } from "@/app/actions/fetch-actions";

export const metadata = {
    title: "Secret - MyToon",
    description: "Насанд хүрэгчдэд зориулсан хэсэг",
};

export default async function SecretPage() {
    return (
        <div className="min-h-screen bg-background pb-20">
            <Suspense fallback={<SecretSkeleton />}>
                <SecretDataFetcher />
            </Suspense>
        </div>
    );
}

async function SecretDataFetcher() {
    try {
        const [webtoonsRes, updatesRes] = await Promise.all([
            getNsfwWebtoonsCached(),
            fetchLatestUpdatesAction(20, true, true) // limit 20, includeNsfw=true, onlyNsfw=true
        ]);

        const webtoons = webtoonsRes.data || [];
        const updates = updatesRes.data || [];

        // Format updates to match SecretClient expectations if needed
        const formattedUpdates = updates.map((c: any) => ({
            id: c.webtoons?.id,
            title: c.webtoons?.title,
            image: c.webtoons?.image,
            chapter_title: c.title,
            chapter_id: c.id,
            created_at: c.created_at,
            rating: c.webtoons?.rating,
            genres: c.webtoons?.genres,
            is_nsfw: c.webtoons?.is_nsfw
        }));

        return <SecretClient initialWebtoons={webtoons} latestUpdates={formattedUpdates} />;
    } catch (error) {
        console.error("SecretDataFetcher Error:", error);
        return <SecretClient initialWebtoons={[]} latestUpdates={[]} />;
    }
}


function SecretSkeleton() {
    return (
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 space-y-12 animate-pulse">
            <div className="h-20 w-full bg-white/5 rounded-3xl mb-12" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="aspect-[3/4.5] bg-white/5 rounded-[2rem]" />
                ))}
            </div>
        </div>
    );
}
