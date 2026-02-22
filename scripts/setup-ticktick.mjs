import http from 'http';
import url from 'url';
import fetch from 'node-fetch';

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const REDIRECT_URI = 'http://localhost:8080';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log('Usage: node setup-ticktick.mjs [CLIENT_ID] [CLIENT_SECRET]');
    process.exit(1);
}

const authUrl = `https://ticktick.com/oauth/authorize?scope=tasks:write&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;

console.log('1. Open this URL in your browser and authorize the app:');
console.log('\x1b[36m%s\x1b[0m', authUrl);
console.log('\n2. Waiting for authorization...');

const server = http.createServer(async (req, res) => {
    const query = url.parse(req.url, true).query;
    if (query.code) {
        res.end('Authorization successful! You can close this window and check your terminal.');

        console.log('Code received. Exchanging for token...');

        const params = new URLSearchParams();
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('code', query.code);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', REDIRECT_URI);

        try {
            const response = await fetch('https://ticktick.com/oauth/token', {
                method: 'POST',
                body: params,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const data = await response.json();
            if (data.access_token) {
                console.log('\n\x1b[32mSUCCESS!\x1b[0m Your TickTick API Token is:');
                console.log('\x1b[7m%s\x1b[0m', data.access_token);
                console.log('\nCopy this token into your Voice Tasker settings.');
            } else {
                console.error('Error exchanging code:', data);
            }
        } catch (err) {
            console.error('Request failed:', err);
        }

        process.exit();
    } else {
        res.end('No code found in URL.');
    }
}).listen(8080);
