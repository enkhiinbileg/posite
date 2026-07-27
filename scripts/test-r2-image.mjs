import { uploadRawToR2 } from "../src/lib/r2.ts";

async function testImageUpload() {
    console.log("Testing R2 image upload...");
    const dummyBuffer = Buffer.from("fake-image-bytes-12345");
    const res = await uploadRawToR2(dummyBuffer, "thumbnails/test.jpg", "image/jpeg");
    console.log("Upload result:", res);
}

testImageUpload();
