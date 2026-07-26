import { Metadata } from 'next';
import LeaderboardClient from './LeaderboardClient';

export const metadata: Metadata = {
    title: 'Шилдэг Уншигчид - Hall of Fame | WEBTOON',
    description: 'Вэбтүүн ертөнцийн хамгийн идэвхтэй уншигчдын жагсаалт. XP цуглуулж жагсаалтыг тэргүүлээрэй.',
    openGraph: {
        title: 'Шилдэг Уншигчид - Hall of Fame',
        description: 'Хамгийн идэвхтэй уншигчдын жагсаалтад орж, өөрийн зэрэглэлээ ахиулаарай.',
        images: ['https://mytoon.site/leaderboard-og.png'], // Placeholder if no specific image
    }
};

export default function Page() {
    return <LeaderboardClient />;
}
