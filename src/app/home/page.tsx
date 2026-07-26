import { Suspense } from "react";
import { HomeClient } from "@/components/home/HomeClient";
import { Loader2 } from "lucide-react";
import { HeroSlider } from "@/components/home/HeroSlider";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import sql from "@/lib/neon";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: any }) {
  const activeSection = (await searchParams)?.section;
  
  // User authentication check is handled by AuthContext on client side seamlessly
  // without triggering server redirect loops when JWT tokens expire.

  return (
    <div className="min-h-screen bg-background">
      {!activeSection && (
        <Suspense fallback={<HeroSkeleton />}>
          <HeroDataFetcher />
        </Suspense>
      )}
      <Suspense fallback={<SectionsSkeleton />}>
        <HomeDataFetcher />
      </Suspense>
    </div>
  );
}

// --- DATA FETCHING COMPONENTS (Supabase primary, Neon fallback) ---

async function HeroDataFetcher() {
  try {
    const { data: banners, error } = await supabaseAdmin
      .from("banners")
      .select(`*, webtoons!banners_webtoon_id_fkey(id, title, description, image, genres)`)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const initialFeatured = (banners || []).map((b: any) => ({
      id: b.webtoon_id,
      title: b.title || b.webtoons?.title,
      description: b.description || b.webtoons?.description,
      image: b.image_url || b.webtoons?.image,
      mobileImage: b.image_mobile_url,
      genres: b.webtoons?.genres,
      firstChapterId: null
    }));

    return <HeroSlider initialFeatured={initialFeatured} />;
  } catch (primaryErr) {
    try {
      const banners = await sql`
        SELECT b.*, 
          w.id as w_id, w.title as w_title, w.description as w_desc, 
          w.image as w_image, w.genres as w_genres
        FROM banners b
        LEFT JOIN webtoons w ON w.id = b.webtoon_id
        WHERE b.is_active = true
        ORDER BY b.sort_order ASC
      `;
      const initialFeatured = (banners || []).map((b: any) => ({
        id: b.webtoon_id,
        title: b.title || b.w_title,
        description: b.description || b.w_desc,
        image: b.image_url || b.w_image,
        mobileImage: b.image_mobile_url,
        genres: b.w_genres,
        firstChapterId: null
      }));
      return <HeroSlider initialFeatured={initialFeatured} />;
    } catch (fallbackErr) {
      return <HeroSlider initialFeatured={[]} />;
    }
  }
}

async function HomeDataFetcher() {
  try {
    const [webtoonsRes, updatesRes, sectionsRes] = await Promise.all([
      supabaseAdmin.from("webtoons").select("*").eq("is_nsfw", false).order("rating", { ascending: false }).limit(20),
      supabaseAdmin.from("chapters").select("id, title, created_at, webtoon_id, webtoons!inner(id, title, image, is_nsfw)").eq('webtoons.is_nsfw', false).order("created_at", { ascending: false }).limit(12),
      supabaseAdmin.from("homepage_sections").select("*").eq("is_visible", true).order("order_index", { ascending: true }),
    ]);

    if (webtoonsRes.error) throw webtoonsRes.error;
    if (sectionsRes.error) throw sectionsRes.error;

    const webtoonsData = webtoonsRes.data || [];
    const updatesData = updatesRes.data || [];
    const sectionsData = sectionsRes.data || [];

    const formattedUpdates = updatesData.map((c: any) => ({
      id: c.webtoons?.id,
      title: c.webtoons?.title,
      image: c.webtoons?.image,
      chapter_title: c.title,
      chapter_id: c.id,
      created_at: c.created_at,
      rating: c.webtoons?.rating,
      genres: c.webtoons?.genres
    }));

    return (
      <HomeClient
        initialWebtoons={webtoonsData}
        initialUpdates={formattedUpdates}
        initialSections={sectionsData}
        recentUpdateIds={[]}
      />
    );
  } catch (primaryErr) {
    try {
      const [neonWebtoons, neonUpdates, neonSections] = await Promise.all([
        sql`SELECT * FROM webtoons WHERE is_nsfw = false ORDER BY rating DESC LIMIT 20`,
        sql`
          SELECT 
            c.id, c.title, c.created_at, c.webtoon_id,
            w.id as w_id, w.title as w_title, w.image as w_image
          FROM chapters c
          INNER JOIN webtoons w ON w.id = c.webtoon_id
          WHERE w.is_nsfw = false
          ORDER BY c.created_at DESC
          LIMIT 50
        `,

        sql`SELECT * FROM homepage_sections WHERE is_visible = true ORDER BY order_index ASC`
      ]);

      const formattedUpdates = (neonUpdates || []).map((c: any) => ({
        id: c.w_id,
        title: c.w_title,
        image: c.w_image,
        chapter_title: c.title,
        chapter_id: c.id,
        created_at: c.created_at
      }));

      return (
        <HomeClient
          initialWebtoons={neonWebtoons || []}
          initialUpdates={formattedUpdates}
          initialSections={neonSections || []}
          recentUpdateIds={[]}
        />
      );
    } catch (fallbackErr) {
      return <HomeClient initialWebtoons={[]} initialUpdates={[]} initialSections={[]} />;
    }
  }
}

// --- SKELETONS ---

function HeroSkeleton() {
  return <div className="aspect-[21/9] w-full bg-surface/50 animate-pulse flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
}

function SectionsSkeleton() {
  return (
    <div className="space-y-16 p-6 lg:p-10 max-w-[1600px] mx-auto animate-pulse">
      <div className="h-16 w-full bg-white/5 rounded-3xl mb-12 border border-white/5" />
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-10 w-64 bg-white/5 rounded-xl" />
            <div className="h-6 w-20 bg-white/5 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 lg:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
              <div key={j} className="space-y-3">
                <div className="aspect-[3/4.5] bg-white/5 rounded-[2rem] border border-white/5" />
                <div className="h-4 w-3/4 bg-white/5 rounded-md" />
                <div className="h-3 w-1/2 bg-white/5 rounded-md opacity-50" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
