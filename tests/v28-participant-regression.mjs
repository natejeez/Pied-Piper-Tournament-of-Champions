import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../web/ui-v28.js', import.meta.url), 'utf8');
const css27 = fs.readFileSync(new URL('../web/ui-v27.css', import.meta.url), 'utf8');
const reset = fs.readFileSync(new URL('../web/dev-reset-v28.js', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../src/worker-v28.js', import.meta.url), 'utf8');

for (const token of ['pointerdown','mousedown','auxclick','keydown','provider-link[href]']) assert.ok(ui.includes(token), `missing ${token}`);
assert.match(ui,/PENDING_KEY/);
assert.match(ui,/flushPending/);
assert.match(ui,/restoreParticipantListening/);
assert.match(ui,/maybeReloadAfterLogout/);
assert.match(css27,/pending-vote-choice/);
assert.match(css27,/rgba\(74,163,98/);
assert.match(css27,/pending-vote-other/);
assert.match(css27,/rgba\(194,72,72/);
assert.match(css27,/vote-btn\{display:block!important\}/);
assert.match(css27,/pending-vote-choice::after/);
assert.match(css27,/submitted-guess/);
assert.match(reset,/scope !== 'user'/);
assert.match(reset,/auth-readiness/);
assert.match(reset,/Reset All Users/);
assert.match(reset,/Git sync\(s\)/);
assert.match(worker,/Test Voter administrator access required/);
assert.match(worker,/PARTICIPANT_AUTH_JSON/);
assert.match(worker,/api\/admin\/auth-readiness/);
assert.match(worker,/ui-v27\.js/);

console.log('v2.8 participant regression: PASS');
