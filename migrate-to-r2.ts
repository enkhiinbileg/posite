import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

// Use the direct Supabase URL for the admin migration script, bypassing the proxy
const SUPABASE_URL = "https://jtlwllzaxscxqtcoqpll.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.NEXT_PUBLIC_R2_BUCKET_NAME!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function listAllFiles(bucket: string, folder: string = ""): Promise<string[]> {
    const files: string[] = [];
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });

    if (error) {
        console.error(`Error listing ${bucket}/${folder}:`, error);
        return files;
    }

    if (!data) return files;

    for (const item of data) {
        const fullPath = folder ? `${folder}/${item.name}` : item.name;

        // Supabase folders usually don't have an ID or metadata (or metadata is nullish)
        if (!item.id && !item.metadata) {
            const subFiles = await listAllFiles(bucket, fullPath);
            files.push(...subFiles);
        } else if (item.name !== ".emptyFolderPlaceholder") {
            files.push(fullPath);
        }
    }
    return files;
}

async function migrate() {
    console.log("Starting Migration to R2...");
    const buckets = ["images", "avatars", "fonts"];

    for (const bucket of buckets) {
        console.log(`\n=== Migrating bucket: ${bucket} ===`);
        const files = await listAllFiles(bucket);
        console.log(`Found ${files.length} files in ${bucket}`);

        let count = 0;
        let successCount = 0;

        for (const file of files) {
            count++;
            console.log(`[${count}/${files.length}] Downloading ${bucket}/${file}...`);

            const { data, error } = await supabase.storage.from(bucket).download(file);
            if (error || !data) {
                console.error(`Failed to download ${bucket}/${file}:`, error);
                continue;
            }

            const arrayBuffer = await data.arrayBuffer();
            const r2Path = `${bucket}/${file}`;

            console.log(`Uploading to R2: ${r2Path}...`);
            try {
                await s3.send(new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: r2Path,
                    Body: Buffer.from(arrayBuffer),
                    ContentType: data.type || "application/octet-stream",
                }));
                successCount++;
            } catch (uploadError) {
                console.error(`Failed to upload ${r2Path}:`, uploadError);
            }
        }
        console.log(`Successfully migrated ${successCount}/${files.length} in bucket '${bucket}'`);
    }

    console.log("\n=== Migration Complete ===");
    console.log("Next steps: Run SQL queries to update old Supabase URLs in your database to R2 URLs.");
    console.log("Example:");
    console.log("UPDATE profiles SET avatar_url = replace(avatar_url, 'https://jtlwllzaxscxqtcoqpll.supabase.co/storage/v1/object/public/avatars/', 'https://pub-153c22e6ca2e4d61b33d4768e4f97534.r2.dev/avatars/');");
}

migrate().catch(console.error);
