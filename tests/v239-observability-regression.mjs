import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker-v39.js',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('../web/published-results-v39.js',import.meta.url),'utf8');
const wrangler=fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');

assert.match(worker,/import workerV38/,'V2.39 must inherit the complete V2.38 behavior surface.');
assert.match(worker,/extends V38ParticipantVoteStore/,'V2.39 must preserve the V2.38 Durable Object implementation.');
assert.match(worker,/published-results-v39\.js/,'V2.39 must serve the event-driven result renderer.');
assert.match(worker,/stats-v3\.js/,'V2.39 must explicitly strip the superseded V3 runtime client.');
assert.match(worker,/stats-v3\.css/,'V2.39 must explicitly strip the superseded V3 runtime stylesheet.');

assert.doesNotMatch(renderer,/observe\(root,\{childList:true,subtree:true\}\)/,'Published results must not watch the bracket subtree.');
assert.doesNotMatch(renderer,/window\.addEventListener\(['"]focus/,'Published results must not refetch on browser focus.');
assert.doesNotMatch(renderer,/setTimeout\(render/,'Published results must not use repeated startup render timers.');
assert.doesNotMatch(renderer,/function schedule\(/,'Published results must not use the V37 watchdog scheduler.');
assert.match(renderer,/v32-published-result/,'Approved compact result-card component must remain.');
assert.match(renderer,/YOUR VOTE/,'Published personalization must remain.');
assert.match(renderer,/WINNER/,'Winner presentation must remain.');
assert.match(renderer,/GROUP GUESSES:/,'Group Harry Man guess rankings must remain.');
assert.match(renderer,/Your guess/,'Personal Harry Man guess must remain.');

assert.match(wrangler,/"main": "src\/worker-v39\.js"/,'V2 test must deploy V2.39.');
assert.match(wrangler,/"GITHUB_BRANCH":"feature\/v2-auth-voting"/,'V2 test Git mirror must remain isolated from main.');
assert.match(wrangler,/"head_sampling_rate":0\.01/,'Worker logs must sample at one percent.');
assert.match(wrangler,/"invocation_logs":false/,'Automatic invocation log emission must be disabled.');

console.log('PASS v2.39 observability regression: functionality inherited, watchdog removed, V3 runtime stripped, logging contained.');
