import { Metadata } from 'next';
import { Suspense } from 'react';
import { ReaderContent } from './ReaderContent';
import { ReaderSkeleton } from './ReaderSkeleton';


interface Props {
    params: Promise<{ id: string; chapterId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id, chapterId } = await params;
    // VERY FAST LIGHTWEIGHT SEO CHECK (Minimal blocking)
    return {
        title: `Уншиж байна... | WEBTOON`, 
        // We could fetch real title here BUT it blocks the shell from appearing on Vercel.
        // For absolute speed, we can use a generic title or a very fast cached one.
    };
}

export default async function ReaderPage({ params }: Props) {
    const { id, chapterId } = await params;

    return (
        <Suspense fallback={<ReaderSkeleton />}>
            <ReaderContent id={id} chapterId={chapterId} />
        </Suspense>
    );
}

export const revalidate = 3600; 
