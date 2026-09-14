import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(new URL('../src/worker-v211.js', import.meta.url), 'utf8');
const wrangler = fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');

assert.match(worker,/LEGACY_VOTE_BRANCH/);
assert.match(worker,/atomic matchup voting owns \.vote-btn\.ready/);
assert.match(worker,/workerV29\.fetch\(request, env, ctx\)/);
assert.match(worker,/x-hmpp-voting-owner/);
assert.match(worker,/x-hmpp-legacy-vote-handler/);
assert.ok(!worker.includes('patchGuessing('), 'v2.11 must not replace the entire guessing client at runtime');
assert.match(wrangler,/pied-piper-tournament-of-champions-v2-test/);
assert.match(wrangler,/src\/worker-v211\.js/);
assert.match(wrangler,/feature\/v2-auth-voting/);
console.log('v2.11 staging regression: PASS');
