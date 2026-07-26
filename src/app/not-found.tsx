import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center space-y-6">
                <h1 className="text-9xl font-black text-primary">404</h1>
                <h2 className="text-3xl font-bold text-white">Хуудас олдсонгүй</h2>
                <p className="text-muted max-w-md mx-auto">
                    Таны хайж байгаа хуудас олдсонгүй. Магадгүй устгагдсан эсвэл хаяг буруу байна.
                </p>
                <Link href="/">
                    <button className="mt-8 flex items-center gap-2 mx-auto px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover transition-all">
                        <Home className="w-5 h-5" />
                        Нүүр хуудас руу буцах
                    </button>
                </Link>
            </div>
        </div>
    );
}
