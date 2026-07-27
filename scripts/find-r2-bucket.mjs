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

async function findBucket() {
    const buckets = ["posite", "webtoon", "mytoon", "posite-media", "media", "posite-bucket"];
    for (const b of buckets) {
        try {
            const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${b}/test-ping.txt`);
            const res = await aws.fetch(url, {
                method: "PUT",
                body: "ping",
                headers: { "Content-Type": "text/plain" }
            });
            console.log(`Bucket '${b}': status ${res.status} ${res.statusText}`);
            if (res.ok) {
                console.log(`🎉 FOUND VALID BUCKET NAME: '${b}'`);
                break;
            }
        } catch (e) {
            console.log(`Bucket '${b}': error ${e.message}`);
        }
    }
}

findBucket();
