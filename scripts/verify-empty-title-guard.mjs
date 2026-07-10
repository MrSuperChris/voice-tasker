import { createTickTickTask } from '../src/lib/ticktick.ts';

let passed = 0, failed = 0;

async function expectReject(label, fn) {
    try {
        await fn();
        console.error(`FAIL (${label}): expected rejection, got resolution`);
        failed++;
    } catch (e) {
        console.log(`PASS (${label}): rejected with "${e.message}"`);
        passed++;
    }
}

// Guard should reject before ever calling fetch.
global.fetch = () => { throw new Error('fetch should not have been called'); };

await expectReject('empty title', () => createTickTickTask({ title: '' }, 'token'));
await expectReject('whitespace-only title', () => createTickTickTask({ title: '   \n\t ' }, 'token'));

// Valid title should reach fetch (and succeed against a stub).
global.fetch = async (_url, _opts) => ({ ok: true, json: async () => ({}) });
try {
    await createTickTickTask({ title: 'Zucchini bread' }, 'token');
    console.log('PASS (valid title): resolved without throwing');
    passed++;
} catch (e) {
    console.error(`FAIL (valid title): unexpected throw "${e.message}"`);
    failed++;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
