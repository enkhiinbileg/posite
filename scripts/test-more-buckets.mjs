import { AwsClient } from "aws4fetch";

const accountId = "0c79d870e37dcd2ad670a834d0488d32";
const accessKeyId = "3cdfddfe7e84d5a16b6a894679d4deb3";
const secretAccessKey = "45e54cac33b41efb421b254f5106667de1fe586be0dec7a90f6843e5cd4b0baa";

const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: "auto",
    service: "s3"
});

async function testMoreBuckets() {
    const candidates = [
        "posite", "posite-media", "posite-bucket", "posite-files", "positedev", 
        "webtoon", "webtoon-media", "webtoons", "mytoon", "mytoon-media", "mytoon-bucket",
        "media", "public", "files", "uploads", "images", "videos"
    ];

    for (const b of candidates) {
        try {
            const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${b}?list-type=2`);
            const res = await aws.fetch(url, { method: "GET" });
            console.log(`Bucket '${b}': ${res.status}`);
            if (res.status !== 404) {
                console.log(`🎉 SUCCESS BUCKET FOUND: '${b}' with status ${res.status}`);
                break;
            }
        } catch (e) { }
    }
}

testMoreBuckets();
