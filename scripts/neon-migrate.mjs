// Schema migration script for Neon
// Run: node scripts/neon-migrate.mjs
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_KkUdao6mLf2h@ep-steep-thunder-aebeo889-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function migrate() {
    console.log('🚀 Running Neon schema migration...');

    try {
        // Enable UUID extension
        await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

        // ── WEBTOONS ───────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS webtoons (
                id BIGSERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                image TEXT,
                cover_image TEXT,
                genres TEXT[] DEFAULT '{}',
                status TEXT DEFAULT 'Ongoing',
                rating DECIMAL(3,1) DEFAULT 0,
                rating_count INTEGER DEFAULT 0,
                views INTEGER DEFAULT 0,
                bookmark_count INTEGER DEFAULT 0,
                follow_count INTEGER DEFAULT 0,
                like_count INTEGER DEFAULT 0,
                chapter_count INTEGER DEFAULT 0,
                is_new BOOLEAN DEFAULT false,
                is_featured BOOLEAN DEFAULT false,
                author TEXT,
                artist TEXT,
                release_year INTEGER,
                age_rating TEXT DEFAULT 'All Ages',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;
        console.log('✅ webtoons table created');

        // ── CHAPTERS ──────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS chapters (
                id BIGSERIAL PRIMARY KEY,
                webtoon_id BIGINT REFERENCES webtoons(id) ON DELETE CASCADE,
                title TEXT,
                order_index INTEGER DEFAULT 0,
                images JSONB DEFAULT '[]',
                view_count INTEGER DEFAULT 0,
                like_count INTEGER DEFAULT 0,
                is_published BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;
        console.log('✅ chapters table created');

        // ── BANNERS ──────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS banners (
                id BIGSERIAL PRIMARY KEY,
                webtoon_id BIGINT REFERENCES webtoons(id) ON DELETE SET NULL,
                title TEXT,
                description TEXT,
                image_url TEXT,
                image_mobile_url TEXT,
                link_url TEXT,
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;
        console.log('✅ banners table created');

        // ── HOMEPAGE_SECTIONS ─────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS homepage_sections (
                id BIGSERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                type TEXT NOT NULL,
                order_index INTEGER DEFAULT 0,
                is_visible BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;
        console.log('✅ homepage_sections table created');

        // ── PROFILES ─────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID PRIMARY KEY,
                username TEXT,
                display_name TEXT,
                email TEXT,
                avatar_url TEXT,
                bio TEXT,
                role TEXT DEFAULT 'user',
                subscription_type TEXT DEFAULT 'free',
                subscription_expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;
        console.log('✅ profiles table created');

        // ── READING_PROGRESS ─────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS reading_progress (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                webtoon_id BIGINT REFERENCES webtoons(id) ON DELETE CASCADE,
                chapter_id BIGINT REFERENCES chapters(id) ON DELETE CASCADE,
                last_read_at TIMESTAMPTZ DEFAULT NOW(),
                is_finished BOOLEAN DEFAULT false,
                UNIQUE(user_id, chapter_id)
            )
        `;
        console.log('✅ reading_progress table created');

        // ── BOOKMARKS ────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                webtoon_id BIGINT REFERENCES webtoons(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, webtoon_id)
            )
        `;
        console.log('✅ bookmarks table created');

        // ── FOLLOWS ──────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS follows (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                webtoon_id BIGINT REFERENCES webtoons(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, webtoon_id)
            )
        `;
        console.log('✅ follows table created');

        // ── LIKES ────────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS likes (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                chapter_id BIGINT REFERENCES chapters(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, chapter_id)
            )
        `;
        console.log('✅ likes table created');

        // ── COMMENTS ─────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS comments (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                webtoon_id BIGINT REFERENCES webtoons(id) ON DELETE CASCADE,
                chapter_id BIGINT REFERENCES chapters(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;
        console.log('✅ comments table created');

        // ── SUGGESTIONS ──────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS suggestions (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;
        console.log('✅ suggestions table created');

        // ── DEFAULT HOMEPAGE SECTIONS ─────────────────────────────────────────
        await sql`
            INSERT INTO homepage_sections (title, type, order_index, is_visible)
            VALUES 
                ('Шинэ Зурагт Ном', 'seasonal', 1, true),
                ('Санал Болгох', 'recommendations', 2, true),
                ('Шинэ Шинжилгээний', 'new_updates', 3, true)
            ON CONFLICT DO NOTHING
        `;
        console.log('✅ Default homepage sections inserted');

        console.log('\n🎉 Neon schema migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

migrate();
