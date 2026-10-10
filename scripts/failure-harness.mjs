// Babel failure-path harness (research card "what happens to a capture when things
// go wrong?", 2026-10-09). Not part of the app build; changes nothing in src/.
//
// Serves dist/ under /voice-tasker/ (as GitHub Pages does), mocks Groq and TickTick
// with Playwright routes, aborts every other non-localhost request, and seeds FAKE
// keys. It never reaches a real API. Prints one JSON result per case (A..F).
//
// Playwright is deliberately not a repo dependency. To run:
//   npm run build
//   (in any scratch dir) npm i playwright@1.48.2 ; npx playwright install chromium
//   node <this file> <absolute path to dist> [case prefix, e.g. D]
// Resolve 'playwright' from the scratch dir: copy this file there, or set NODE_PATH.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = process.argv[2];
const ONLY = process.argv[3];
const PORT = 4791;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (!u.pathname.startsWith('/voice-tasker/')) { res.writeHead(404); return res.end('not under base'); }
  let p = path.join(DIST, u.pathname.slice('/voice-tasker/'.length) || 'index.html');
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(PORT, r));
const URL_ = `http://localhost:${PORT}/voice-tasker/`;

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];

async function setup({ groq, tick }) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', permissions: ['microphone'] });
  const log = { groq: [], tick: [], blocked: [] };
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(`http://localhost:${PORT}/`)) return route.continue();
    if (url.includes('api.groq.com')) { log.groq.push({ bytes: (route.request().postDataBuffer() || []).length }); return groq(route, log); }
    if (url.includes('api.ticktick.com')) { log.tick.push(JSON.parse(route.request().postData() || '{}')); return tick(route, log); }
    log.blocked.push(url); return route.abort();
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('voice-tasker-settings', JSON.stringify({ openaiKey: 'gsk_FAKE', tickTickToken: 'tt_FAKE', dropboxToken: '', defaultDate: 'Today', taskType: 'Inbox' }));
    // stash streams so a test can end the mic track
    const MR = window.MediaRecorder; window.__recs = [];
    window.MediaRecorder = class extends MR { constructor(...a){ super(...a); window.__recs.push(this); this.addEventListener('stop', () => (window.__stopEvents = (window.__stopEvents||0)+1)); } };
    window.MediaRecorder.isTypeSupported = MR.isTypeSupported.bind(MR);
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async c => { const s = await orig(c); (window.__streams ||= []).push(s); return s; };
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => log.pageerror = String(e));
  await page.goto(URL_);
  await page.waitForSelector('text=DON\'T PANIC');
  return { ctx, page, log };
}
const ok = (text = 'buy milk') => r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text }) });
const tickOk = r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'abc', title: 'x' }) });
const hang = () => {};
const screenText = async page => (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 160);
const record = async (page, ms = 1500) => { await page.locator('button').first().click(); await page.waitForSelector('text=STOP RECORDING'); await sleep(ms); };
const stop = page => page.click('text=STOP RECORDING');
const toReview = async page => { await record(page); await stop(page); await page.waitForSelector('text=TRANSCRIPTION'); };
const doIt = page => page.locator('button', { hasText: /^DO$/ }).click();
const textEntryValue = async page => { await page.click('[title="Type a task"]'); await page.waitForSelector('text=TYPE TASK'); return page.locator('textarea').inputValue(); };
const storage = page => page.evaluate(async () => ({ ls: Object.keys(localStorage), idb: (await indexedDB.databases?.() || []).map(d => d.name) }));

async function run(name, fn) {
  if (ONLY && !name.startsWith(ONLY)) return;
  try { const r = await fn(); results.push({ name, ...r }); }
  catch (e) { results.push({ name, harnessError: String(e).slice(0, 300) }); }
}

// A. network drop during Groq upload
await run('A1 groq network drop', async () => {
  const { ctx, page, log } = await setup({ groq: r => r.abort('internetdisconnected'), tick: tickOk });
  await record(page); await stop(page); await page.waitForSelector('text=ENTRY FAILED');
  const shown = await screenText(page);
  await page.click('text=TAP SCREEN TO CONTINUE');
  const draft = await textEntryValue(page);
  const r = { shown, groqCalls: log.groq.length, audioBytesSent: log.groq[0]?.bytes, textEntryAfter: draft, storage: await storage(page) };
  await ctx.close(); return r;
});
await run('A2 groq 502 html', async () => {
  const { ctx, page, log } = await setup({ groq: r => r.fulfill({ status: 502, contentType: 'text/html', body: '<html>Bad Gateway</html>' }), tick: tickOk });
  await record(page); await stop(page); await page.waitForSelector('text=ENTRY FAILED');
  const r = { shown: await screenText(page), groqCalls: log.groq.length }; await ctx.close(); return r;
});
await run('A3 groq hangs', async () => {
  const { ctx, page, log } = await setup({ groq: hang, tick: tickOk });
  await record(page); await stop(page); await sleep(20000);
  const r = { after20s: await screenText(page), buttons: await page.locator('button').count(), groqCalls: log.groq.length }; await ctx.close(); return r;
});
// B. Groq 429 / malformed success
await run('B1 groq 429', async () => {
  const { ctx, page, log } = await setup({ groq: r => r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Rate limit reached for model whisper-large-v3-turbo. Please try again in 7s.', type: 'requests', code: 'rate_limit_exceeded' } }) }), tick: tickOk });
  await record(page); await stop(page); await page.waitForSelector('text=ENTRY FAILED');
  const r = { shown: await screenText(page), groqCalls: log.groq.length }; await ctx.close(); return r;
});
await run('B2 groq 200 no text field', async () => {
  const { ctx, page, log } = await setup({ groq: r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }), tick: tickOk });
  await record(page); await stop(page); await page.waitForSelector('text=ENTRY FAILED');
  const r = { shown: await screenText(page) }; await ctx.close(); return r;
});
// C. TickTick failures
await run('C1 ticktick 500', async () => {
  const { ctx, page, log } = await setup({ groq: ok('call the dentist about the crown'), tick: r => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ errorMessage: 'internal' }) }) });
  await toReview(page); await doIt(page); await page.waitForSelector('text=ENTRY FAILED');
  const shown = await screenText(page);
  await page.click('text=TAP SCREEN TO CONTINUE');
  const draft = await textEntryValue(page);
  // Back out the way a user would (DON'T), then check again
  return (async () => { const r = { shown, tickCalls: log.tick.length, textEntryAfterFail: draft }; await ctx.close(); return r; })();
});
await run('C1b ticktick 500 then new recording', async () => {
  const { ctx, page, log } = await setup({ groq: ok('call the dentist about the crown'), tick: r => r.fulfill({ status: 500, body: '' }) });
  await toReview(page); await doIt(page); await page.waitForSelector('text=ENTRY FAILED');
  await page.click('text=TAP SCREEN TO CONTINUE');
  log.groq.length = 0;
  await ctx.unroute('**/*').catch(() => {});
  await ctx.route('**/*', r => r.request().url().includes('localhost') ? r.continue() : r.request().url().includes('groq') ? ok('second thought')(r) : r.abort());
  await toReview(page);
  const r = { reviewShows: await page.locator('textarea').inputValue() }; await ctx.close(); return r;
});
await run('C2 ticktick network drop', async () => {
  const { ctx, page, log } = await setup({ groq: ok(), tick: r => r.abort('internetdisconnected') });
  await toReview(page); await doIt(page); await page.waitForSelector('text=ENTRY FAILED');
  const r = { shown: await screenText(page), tickCalls: log.tick.length }; await ctx.close(); return r;
});
await run('C3 ticktick 200 empty body', async () => {
  const { ctx, page, log } = await setup({ groq: ok(), tick: r => r.fulfill({ status: 200, body: '' }) });
  // Post-fix: a 2xx with no task body must NOT flash TASK ADDED; it fails honestly
  // and the draft stays reachable. (Before the fix this waited for TASK ADDED.)
  await toReview(page); await doIt(page); await page.waitForSelector('text=ENTRY FAILED');
  const shown = await screenText(page);
  await page.click('text=TAP SCREEN TO CONTINUE');
  const r = { shown, tickCalls: log.tick.length, textEntryAfter: await textEntryValue(page) }; await ctx.close(); return r;
});
await run('C4 ticktick hangs', async () => {
  const { ctx, page, log } = await setup({ groq: ok(), tick: hang });
  await toReview(page); await doIt(page); await sleep(20000);
  const r = { after20s: await screenText(page), buttons: await page.locator('button').count() }; await ctx.close(); return r;
});
// D. backgrounding / mic loss
async function groqBytesFor(fnDuringRecording, ms = 6000) {
  const { ctx, page, log } = await setup({ groq: ok(), tick: tickOk });
  const cdp = await ctx.newCDPSession(page);
  await page.locator('button').first().click(); await page.waitForSelector('text=STOP RECORDING');
  const extra = await fnDuringRecording(page, cdp, ctx, ms);
  const recState = await page.evaluate(() => window.__streams?.at(-1)?.getAudioTracks().map(t => t.readyState));
  await stop(page);
  const outcome = await Promise.race([
    page.waitForSelector('text=TRANSCRIPTION').then(() => 'REVIEW'),
    page.waitForSelector('text=ENTRY FAILED').then(() => 'FAILED'),
    sleep(15000).then(() => 'STILL: ' + 'timeout')]);
  const r = { outcome, screen: await screenText(page), groqBytes: log.groq[0]?.bytes, trackState: recState, ...extra };
  await ctx.close(); return r;
}
await run('D0 control 6s', () => groqBytesFor(async (p, c, x, ms) => { await sleep(ms); return {}; }));
await run('D1 hidden tab 6s', () => groqBytesFor(async (page, cdp, ctx, ms) => {
  const other = await ctx.newPage(); await other.goto('about:blank'); await other.bringToFront();
  await sleep(ms); const vis = await page.evaluate(() => document.visibilityState);
  await page.bringToFront(); await other.close(); return { visibilityDuring: vis };
}));
await run('D2 frozen 6s', () => groqBytesFor(async (page, cdp, ctx, ms) => {
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' }); await sleep(ms);
  await cdp.send('Page.setWebLifecycleState', { state: 'active' }); return {};
}));
await run('D3 mic track ends', () => groqBytesFor(async (page, cdp, ctx, ms) => {
  await sleep(2000);
  await page.evaluate(() => window.__streams.at(-1).getTracks().forEach(t => { t.stop(); }));
  await sleep(1000); return await page.evaluate(() => ({ recorderStateBeforeStop: window.__recs.at(-1).state, stopEventsBeforeStop: window.__stopEvents||0 }));
}));
// E. reload mid-capture
await run('E1 reload while recording', async () => {
  const { ctx, page, log } = await setup({ groq: ok(), tick: tickOk });
  await record(page, 2000);
  let dialog = null; page.on('dialog', d => { dialog = d.type(); d.accept(); });
  await page.reload(); await page.waitForSelector('text=DON\'T PANIC');
  const r = { beforeunloadPrompt: dialog, screen: await screenText(page), groqCalls: log.groq.length, textEntry: await textEntryValue(page), storage: await storage(page) };
  await ctx.close(); return r;
});
await run('E2 reload while transcribing', async () => {
  const { ctx, page, log } = await setup({ groq: hang, tick: tickOk });
  await record(page); await stop(page); await sleep(1000);
  await page.reload(); await page.waitForSelector('text=DON\'T PANIC');
  const r = { screen: await screenText(page), textEntry: await textEntryValue(page) }; await ctx.close(); return r;
});
await run('E3 reload on review (edited)', async () => {
  const { ctx, page, log } = await setup({ groq: ok('original transcript'), tick: tickOk });
  await toReview(page); await page.locator('textarea').fill('original transcript plus my careful edits');
  await page.reload(); await page.waitForSelector('text=DON\'T PANIC');
  const r = { screen: await screenText(page), textEntry: await textEntryValue(page), storage: await storage(page) }; await ctx.close(); return r;
});
await run('E4 reload during ticktick submit', async () => {
  const { ctx, page, log } = await setup({ groq: ok('submit me'), tick: hang });
  await toReview(page); await doIt(page); await sleep(800);
  await page.reload(); await page.waitForSelector('text=DON\'T PANIC');
  const r = { tickCallsStarted: log.tick.length, textEntry: await textEntryValue(page) }; await ctx.close(); return r;
});
// F. empty / garbage transcript
for (const [n, t] of [['F1 empty', ''], ['F2 whitespace', '   \n '], ['F3 hallucination', 'Thank you.']]) {
  await run(n, async () => {
    const { ctx, page, log } = await setup({ groq: ok(t), tick: tickOk });
    await record(page); await stop(page);
    const where = await Promise.race([page.waitForSelector('text=TRANSCRIPTION').then(() => 'REVIEW'), page.waitForSelector('text=ENTRY FAILED').then(() => 'FAILED')]);
    const r = { where, shown: await screenText(page), tickCalls: log.tick.length }; await ctx.close(); return r;
  });
}
await run('F4 review cleared to whitespace + double DO', async () => {
  const { ctx, page, log } = await setup({ groq: ok('real words'), tick: r => setTimeout(() => tickOk(r), 500) });
  await toReview(page);
  await page.locator('textarea').fill('   ');
  const disabledWhenBlank = await page.locator('button', { hasText: /^DO$/ }).isDisabled();
  await page.locator('textarea').fill('real words');
  await page.locator('button', { hasText: /^DO$/ }).dblclick();
  await page.waitForSelector('text=TASK ADDED');
  const r = { disabledWhenBlank, tickCalls: log.tick.length }; await ctx.close(); return r;
});

console.log(JSON.stringify(results, null, 1));
await browser.close(); server.close();
