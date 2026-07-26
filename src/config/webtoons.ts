export interface Chapter {
    id: number;
    title: string;
    date: string;
    isRead: boolean;
}

export interface Webtoon {
    id: number;
    title: string;
    author: string;
    rating: string;
    genre: string[];
    description: string;
    image: string;
    chapter: string;
    isNew?: boolean;
    chapters: Chapter[];
}

export const WEBTOONS: Webtoon[] = [
    {
        id: 1,
        title: "Алтан Камуй",
        author: "Satoru Noda",
        rating: "4.9",
        genre: ["ACTION", "ADVENTURE", "HISTORICAL"],
        description: "Хоккайдогийн зэлүүд нутагт Сагири хэмээх эр болон Айнү охин Асирпа нар нуугдмал алтны эрэлд гарна.",
        image: "https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=400",
        chapter: "2-р анги",
        isNew: true,
        chapters: Array.from({ length: 20 }, (_, i) => ({
            id: 20 - i,
            title: `Бүлэг ${20 - i}`,
            date: "2024.01.15",
            isRead: i > 5
        }))
    },
    {
        id: 2,
        title: "Баатарын Авьяастан",
        author: "Kim Shin",
        rating: "4.8",
        genre: ["ACTION", "FANTASY"],
        description: "Ер бусын хүч авьяастай төрсөн баатар өөрийн хувь заяагаа олж нээхээр аялалд гарна.",
        image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?q=80&w=400",
        chapter: "15-р анги",
        chapters: Array.from({ length: 15 }, (_, i) => ({
            id: 15 - i,
            title: `Бүлэг ${15 - i}`,
            date: "2024.01.14",
            isRead: false
        }))
    },
    {
        id: 3,
        title: "Дарвины Хэрэг",
        author: "Shun Umezawa",
        rating: "4.7",
        genre: ["MYSTERY", "DRAMA"],
        description: "Хүн төрөлхтний хувьсал болон Дарвины онолын нууцыг тайлах нууцлаг хэрэг.",
        image: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=400",
        chapter: "43-р анги",
        chapters: Array.from({ length: 43 }, (_, i) => ({
            id: 43 - i,
            title: `Бүлэг ${43 - i}`,
            date: "2024.01.13",
            isRead: true
        }))
    },
    {
        id: 4,
        title: "Ид шид ба Булчин",
        author: "Hajime Komoto",
        rating: "4.6",
        genre: ["COMEDY", "FANTASY", "ACTION"],
        description: "Ид шидийн ертөнцөд ганцхан булчингаараа бүхнийг шийддэг хүүгийн тухай хөгжилтэй түүх.",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400",
        chapter: "6-р анги",
        chapters: Array.from({ length: 6 }, (_, i) => ({
            id: 6 - i,
            title: `Бүлэг ${6 - i}`,
            date: "2024.01.12",
            isRead: false
        }))
    },
    {
        id: 5,
        title: "Синжа Хулгайч",
        author: "Park Tae-Jun",
        rating: "4.9",
        genre: ["ROMANCE", "DRAMA"],
        description: "Хагуул хулгайч болон баян авхайн хооронд өрнөх сонирхолтой хайрын түүх.",
        image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=400",
        chapter: "1-р анги",
        isNew: true,
        chapters: Array.from({ length: 1 }, (_, i) => ({
            id: 1,
            title: `Бүлэг 1`,
            date: "2024.01.11",
            isRead: false
        }))
    },
    {
        id: 6,
        title: "Шуламтай хамт бичсэн өдрийн тэмдэглэл",
        author: "Kyo Shirodaira",
        rating: "4.9",
        genre: ["ROMANCE", "SUPERNATURAL"],
        description: "Аймшигт шулам болон жирийн нэгэн залуугийн хамтын өдрийн тэмдэглэл.",
        image: "https://images.unsplash.com/photo-1578632738980-4334635c890a?q=80&w=600",
        chapter: "24-р анги",
        chapters: Array.from({ length: 24 }, (_, i) => ({
            id: 24 - i,
            title: `Бүлэг ${24 - i}`,
            date: "2024.01.10",
            isRead: true
        }))
    }
];
