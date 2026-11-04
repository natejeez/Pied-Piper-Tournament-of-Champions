import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker-v213-prod.js',import.meta.url),'utf8');
const guessing=fs.readFileSync(new URL('../web/guessing.js',import.meta.url),'utf8');

assert.match(worker,/workerV29/,'production wrapper must inherit production v2.9 backend/runtime');
assert.match(worker,/asset\.body/,'production must serve the stable client source directly');
assert.ok(!worker.includes('replaceBlock'),'production must not rewrite client source at request time');
assert.match(worker,/modal-atomic-matchup/,'modal atomic workflow must own voting');
assert.match(guessing,/function confirmMatchup\(match\)/,'confirmation modal workflow must remain');
assert.match(guessing,/returnedGuesses=Array\.isArray\(data\.guesses\)/,'guess response must be normalized before forEach');
assert.match(guessing,/new MutationObserver\(syncAccount\)\.observe\(account/,'observer must be account-only');
assert.ok(!guessing.includes('observer.observe(document.body'),'document-wide observer must not return');
assert.match(guessing,/function selectVote\(btn\)/,'Tap to vote selection must remain in the stable asset');
console.log('v2.13 production regression: PASS');
