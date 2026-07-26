const http = require('http');
const fs = require('fs');

http.get('http://localhost:3000/webtoon/60/read/304', (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        fs.writeFileSync('error-response.html', rawData);
        console.log('Saved to error-response.html');
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
