import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker-v212.js',import.meta.url),'utf8');
const wrangler=fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');

for(const token of ['inline-submit-matchup','Object.values(data.guesses||{})','ACCOUNT_ONLY_OBSERVER','matchup-submit-error','submitted-guesses']){
  assert.ok(worker.includes(token),`missing ${token}`);
}
assert.ok(worker.includes("const asset=await env.ASSETS.fetch(request)"),'staging should patch the raw guessing asset directly');
assert.ok(worker.includes("if(url.pathname==='/guessing.js')"),'staging guessing.js interception missing');
assert.ok(worker.includes("new MutationObserver(syncAccount).observe(account"),'observer must be scoped to account button only');
assert.ok(!worker.includes("observer.observe(document.body"),'broad document observer must not return');
assert.ok(worker.includes("button.textContent='Submitting…'"),'inline submit progress state missing');
assert.ok(!worker.includes("openWorkflowModal(modal)"),'matchup confirmation modal must not own submission');
assert.match(wrangler,/"main":\s*"src\/worker-v212\.js"/);
assert.match(wrangler,/"name":\s*"pied-piper-tournament-of-champions-v2-test"/);
assert.match(wrangler,/"GITHUB_BRANCH":\s*"feature\/v2-auth-voting"/);
console.log('v2.12 staging regression: PASS');
