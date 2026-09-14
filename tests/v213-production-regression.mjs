import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker-v213-prod.js',import.meta.url),'utf8');
const guessing=fs.readFileSync(new URL('../web/guessing.js',import.meta.url),'utf8');

assert.match(worker,/workerV29/,'production wrapper must inherit production v2.9 backend/runtime');
assert.match(worker,/LEGACY_VOTE_BRANCH/,'legacy single-vote handler must be disabled');
assert.match(worker,/modal-atomic-matchup/,'modal atomic workflow must own voting');
assert.ok(!worker.includes('SAFE_QUERY_HELPERS'),'production must not rewrite $/$$ helpers');
assert.ok(!worker.includes('helperOld'),'production must not reintroduce replacement-string $ expansion');
assert.match(guessing,/function confirmMatchup\(match\)/,'confirmation modal workflow must remain');
assert.match(worker,/returnedGuesses=Array\.isArray\(data\.guesses\)/,'guess response must be normalized before forEach');
assert.match(worker,/new MutationObserver\(syncAccount\)\.observe\(account/,'observer must be account-only');
assert.ok(!worker.includes("observer.observe(document.body"),'document-wide observer must not return');
assert.match(worker,/function selectVote\(btn\)/,'Tap to vote selection must remain');
console.log('v2.13 production regression: PASS');
