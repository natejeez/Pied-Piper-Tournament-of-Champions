import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker-v213.js',import.meta.url),'utf8');
const guessing=fs.readFileSync(new URL('../web/guessing.js',import.meta.url),'utf8');

assert.ok(!worker.includes('SAFE_QUERY_HELPERS'),'v2.13 must not rewrite $/$$ helpers');
assert.ok(!worker.includes('helperOld'),'v2.13 must not reintroduce replacement-string $ expansion');
assert.match(guessing,/id='matchupConfirmModal'|id=\"matchupConfirmModal\"/,'matchup confirmation modal must remain in the client');
assert.match(guessing,/function confirmMatchup\(match\)/,'modal confirmation workflow must remain');
assert.match(worker,/modal-atomic-matchup/,'modal atomic workflow must own voting');
assert.match(worker,/returnedGuesses=Array\.isArray\(data\.guesses\)/,'guess response must be normalized before forEach');
assert.match(worker,/new MutationObserver\(syncAccount\)\.observe\(account/,'observer must be account-only');
assert.ok(!worker.includes("observer.observe(document.body"),'document-wide observer must not return');
assert.match(worker,/function selectVote\(btn\)/,'Tap to vote selection must be patched');
console.log('v2.13 targeted regression: PASS');
