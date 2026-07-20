// Verifies the API-layer guards in src/lib/ticktick.ts.
// Run: node --experimental-strip-types scripts/verify-empty-title-guard.mjs
import { createTickTickTask } from '../src/lib/ticktick.ts';

let passed = 0, failed = 0;

function pass(label, detail) {
    console.log(`PASS (${label})${detail ? `: ${detail}` : ''}`);
    passed++;
}

function fail(label, detail) {
    console.error(`FAIL (${label})${detail ? `: ${detail}` : ''}`);
    failed++;
}

async function expectReject(label, fn) {
    try {
        await fn();
        fail(label, 'expected rejection, got resolution');
    } catch (e) {
        pass(label, `rejected with "${e.message}"`);
    }
}

// Guard should reject before ever calling fetch.
global.fetch = () => { throw new Error('fetch should not have been called'); };

await expectReject('empty title', () => createTickTickTask({ title: '' }, 'token'));
await expectReject('whitespace-only title', () => createTickTickTask({ title: '   \n\t ' }, 'token'));
await expectReject('undefined title', () => createTickTickTask({}, 'token'));

// Valid title should reach fetch (and succeed against a stub).
let lastBody = null;
global.fetch = async (_url, opts) => {
    lastBody = JSON.parse(opts.body);
    return { ok: true, json: async () => ({}) };
};

try {
    await createTickTickTask({ title: 'Zucchini bread' }, 'token');
    pass('valid title', 'resolved without throwing');
} catch (e) {
    fail('valid title', `unexpected throw "${e.message}"`);
}

// A padded-but-real title is accepted, and sent trimmed.
try {
    await createTickTickTask({ title: '  Zucchini bread \n', tags: ['cooking'] }, 'token');
    if (lastBody.title === 'Zucchini bread') {
        pass('padded title trimmed on the wire', JSON.stringify(lastBody.title));
    } else {
        fail('padded title trimmed on the wire', `sent ${JSON.stringify(lastBody.title)}`);
    }
    if (lastBody.tags?.[0] === 'cooking') {
        pass('other fields preserved', 'tags survived the rewrite');
    } else {
        fail('other fields preserved', `tags were ${JSON.stringify(lastBody.tags)}`);
    }
} catch (e) {
    fail('padded title', `unexpected throw "${e.message}"`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
