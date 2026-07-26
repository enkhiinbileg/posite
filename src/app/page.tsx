import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NetflixLanding } from "@/components/auth/NetflixLanding";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function LandingPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const code = typeof searchParams.code === 'string' ? searchParams.code : undefined;

  // If OAuth code is present in URL query (fallback redirect), forward to auth callback
  if (code) {
    const next = typeof searchParams.next === 'string' ? searchParams.next : '/';
    redirect(`/auth/callback?code=${code}&next=${encodeURIComponent(next)}`);
  }

  // To check user status on server (for initial render)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isLoginExplicit = searchParams.login === 'true';

  // If already logged in, redirect to the home page immediately (unless explicit login is requested)
  if (user && !isLoginExplicit) {
    redirect('/home');
  }

  // Fetch some webtoons for the landing page grid (Visual appeal)
  const { data: landingWebtoons } = await supabaseAdmin
    .from('webtoons')
    .select('id, title, image')
    .order('rating', { ascending: false })
    .limit(30);

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <NetflixLanding webtoons={landingWebtoons || []} />
    </Suspense>
  );
}
