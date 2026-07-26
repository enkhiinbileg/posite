import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Needs service role for storage access
const r2AccountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID!;
const r2AccessKeyId = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID!;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
const bucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
    },
});

async function migrateFolder(bucket: string, folder: string = '') {
    console.log(`Listing items in Supabase bucket: ${bucket}, folder: ${folder}`);

    const { data: items, error } = await supabase.storage.from(bucket).list(folder);

    if (error) {
        console.error(`Error listing items in ${folder}:`, error);
        return;
    }

    for (const item of items) {
        const itemPath = folder ? `${folder}/${item.name}` : item.name;

        if (item.id === null) {
            // It's a folder (based on Supabase listing logic)
            await migrateFolder(bucket, itemPath);
        } else {
            // It's a file
            await migrateFile(bucket, itemPath);
        }
    }
}

async function migrateFile(bucket: string, filePath: string) {
    // Supabase path vs R2 path:
    // Supabase usually has bucket name in URL, but .list() is bucket-relative.
    // getCDNUrl expects R2 to match the part after /public/
    // So if bucket is 'webtoons', R2 path should be 'webtoons/path/to/file.jpg'
    const r2Path = `${bucket}/${filePath}`;

    try {
        // 1. Check if exists in R2
        await s3.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: r2Path,
        }));
        console.log(`[SKIP] ${r2Path} already exists in R2`);
    } catch (err: any) {
        if (err.name === 'NotFound') {
            // 2. Download from Supabase
            console.log(`[SYNC] ${r2Path} -> Downloading from Supabase...`);
            const { data, error } = await supabase.storage.from(bucket).download(filePath);

            if (error || !data) {
                console.error(`Error downloading ${filePath}:`, error);
                return;
            }

            // 3. Upload to R2
            const arrayBuffer = await data.arrayBuffer();
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: r2Path,
                Body: Buffer.from(arrayBuffer),
                ContentType: data.type || 'image/jpeg',
            }));
            console.log(`[DONE] ${r2Path} uploaded to R2`);
        } else {
            console.error(`Error checking R2 for ${r2Path}:`, err);
        }
    }
}

async function main() {
    // List of buckets to migrate
    const buckets = ['images', 'webtoons', 'avatars']; // Migrating all relevant buckets

    for (const bucket of buckets) {
        await migrateFolder(bucket);
    }
}

main().catch(console.error);
