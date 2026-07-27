const { AwsClient } = require('aws4fetch');
const accountId = '0c79d870e37dcd2ad670a834d0488d32';
const accessKeyId = '3cdfddfe7e84d5a16b6a894679d4deb3';
const secretAccessKey = '45e54cac33b41efb421b254f5106667de1fe586be0dec7a90f6843e5cd4b0baa';
const aws = new AwsClient({ accessKeyId, secretAccessKey, region: 'auto', service: 's3' });

const corsXml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <ExposeHeader>ETag</ExposeHeader>
    </CORSRule>
</CORSConfiguration>`;

async function setCors() {
    const url = 'https://' + accountId + '.r2.cloudflarestorage.com/pomongolia?cors';
    try {
        const res = await aws.fetch(url, {
            method: 'PUT',
            body: corsXml,
            headers: {
                'Content-Type': 'application/xml',
                'Content-Length': String(Buffer.byteLength(corsXml))
            }
        });
        console.log('Status:', res.status, res.statusText);
        const text = await res.text();
        console.log('Response:', text);
    } catch(e) {
        console.error('Error:', e);
    }
}
setCors();
