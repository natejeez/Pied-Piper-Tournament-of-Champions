const MATCHES = {"PI01":{"round":"play-in","songs":["SONG26-019","SONG26-016"]},"PI02":{"round":"play-in","songs":["SONG26-042","SONG26-001"]},"PI03":{"round":"play-in","songs":["SONG26-052","SONG26-031"]},"PI04":{"round":"play-in","songs":["SONG26-051","SONG26-057"]},"PI05":{"round":"play-in","songs":["SONG26-069","SONG26-034"]},"PI06":{"round":"play-in","songs":["SONG26-028","SONG26-062"]},"PI07":{"round":"play-in","songs":["SONG26-044","SONG26-020"]},"PI08":{"round":"play-in","songs":["SONG26-066","SONG26-003"]},"M001":{"round":"round-of-64","songs":["SONG26-046","SONG26-061"]},"M002":{"round":"round-of-64","songs":["SONG26-004","SONG26-050"]},"M003":{"round":"round-of-64","songs":["SONG26-055"]},"M004":{"round":"round-of-64","songs":["SONG26-068","SONG26-021"]},"M005":{"round":"round-of-64","songs":["SONG26-072"]},"M006":{"round":"round-of-64","songs":["SONG26-022","SONG26-029"]},"M007":{"round":"round-of-64","songs":["SONG26-007","SONG26-032"]},"M008":{"round":"round-of-64","songs":["SONG26-065","SONG26-010"]},"M009":{"round":"round-of-64","songs":["SONG26-071","SONG26-013"]},"M010":{"round":"round-of-64","songs":["SONG26-009","SONG26-059"]},"M011":{"round":"round-of-64","songs":["SONG26-011","SONG26-056"]},"M012":{"round":"round-of-64","songs":["SONG26-067","SONG26-008"]},"M013":{"round":"round-of-64","songs":["SONG26-033"]},"M014":{"round":"round-of-64","songs":["SONG26-037"]},"M015":{"round":"round-of-64","songs":["SONG26-025","SONG26-045"]},"M016":{"round":"round-of-64","songs":["SONG26-027","SONG26-039"]},"M017":{"round":"round-of-64","songs":["SONG26-012","SONG26-058"]},"M018":{"round":"round-of-64","songs":["SONG26-018","SONG26-040"]},"M019":{"round":"round-of-64","songs":["SONG26-038"]},"M020":{"round":"round-of-64","songs":["SONG26-070","SONG26-048"]},"M021":{"round":"round-of-64","songs":["SONG26-053","SONG26-005"]},"M022":{"round":"round-of-64","songs":["SONG26-036","SONG26-041"]},"M023":{"round":"round-of-64","songs":["SONG26-060","SONG26-023"]},"M024":{"round":"round-of-64","songs":["SONG26-017"]},"M025":{"round":"round-of-64","songs":["SONG26-043","SONG26-024"]},"M026":{"round":"round-of-64","songs":["SONG26-006"]},"M027":{"round":"round-of-64","songs":["SONG26-047","SONG26-015"]},"M028":{"round":"round-of-64","songs":["SONG26-054","SONG26-002"]},"M029":{"round":"round-of-64","songs":["SONG26-026","SONG26-035"]},"M030":{"round":"round-of-64","songs":["SONG26-063","SONG26-049"]},"M031":{"round":"round-of-64","songs":["SONG26-014","SONG26-030"]},"M032":{"round":"round-of-64","songs":["SONG26-064"]}};
const SESSION_COOKIE = 'hmpp_session';
const FIVE_MINUTES = 5 * 60 * 1000;

function jsonResponse(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...headers } });
}
function bytesToBase64(bytes) { let s=''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }
function base64ToBytes(s) { const raw=atob(s); return Uint8Array.from(raw, c=>c.charCodeAt(0)); }
function b64url(bytes) { return bytesToBase64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function fromB64url(s) { s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; return base64ToBytes(s); }
function utf8(s) { return new TextEncoder().encode(s); }
function text(bytes) { return new TextDecoder().decode(bytes); }
async function sha256Hex(value) { const d=await crypto.subtle.digest('SHA-256', utf8(value)); return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
async function hmac(secret, data) { const key=await crypto.subtle.importKey('raw',utf8(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']); return new Uint8Array(await crypto.subtle.sign('HMAC',key,utf8(data))); }
async function makeSession(secret, payload) { const body=b64url(utf8(JSON.stringify(payload))); const sig=b64url(await hmac(secret,body)); return body+'.'+sig; }
async function readSession(request, env) {
  const cookie=request.headers.get('cookie')||''; const m=cookie.match(new RegExp('(?:^|;\\s*)'+SESSION_COOKIE+'=([^;]+)')); if(!m)return null;
  const [body,sig]=m[1].split('.'); if(!body||!sig)return null;
  const expected=b64url(await hmac(env.SESSION_SECRET,body)); if(sig!==expected)return null;
  try { const p=JSON.parse(text(fromB64url(body))); if(!p.sub||!p.exp||Date.now()>p.exp)return null; return p; } catch { return null; }
}
function sessionCookie(token) { return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`; }
function clearCookie() { return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`; }
async function participantList(env) {
  const url=new URL('/data/2026/participants/public.json','https://assets.local');
  const r=await env.ASSETS.fetch(new Request(url)); if(!r.ok) throw new Error('Participant list unavailable');
  return (await r.json()).participants;
}
async function authConfig(env) {
  if(!env.PARTICIPANT_AUTH_JSON) throw new Error('PARTICIPANT_AUTH_JSON secret is not configured');
  const parsed=JSON.parse(env.PARTICIPANT_AUTH_JSON); return parsed.participants || parsed;
}
function getStore(env, participantId) { return env.PARTICIPANT_VOTES.get(env.PARTICIPANT_VOTES.idFromName(participantId)); }
function isTestParticipant(p) { return p?.is_test === true || p?.id === 'test-voter'; }
async function storeCall(env, participantId, action, payload={}) {
  const stub=getStore(env,participantId);
  return stub.fetch('https://vote-store.internal/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({participant_id:participantId,...payload})});
}

export default {
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if(url.pathname==='/api/participants' && request.method==='GET') {
        return jsonResponse({participants:await participantList(env)});
      }
      if(url.pathname==='/api/login' && request.method==='POST') {
        const {participant_id,email}=await request.json();
        if(!participant_id||!email) return jsonResponse({error:'Participant and email are required.'},400);
        const list=await participantList(env); const p=list.find(x=>x.id===participant_id); if(!p)return jsonResponse({error:'Unknown participant.'},401);
        const cfg=await authConfig(env); const expected=cfg[participant_id]?.email_sha256 || cfg[participant_id];
        if(!expected) return jsonResponse({error:'Participant login has not been configured by the tournament administrator.'},503);
        const actual=await sha256Hex(String(email).trim().toLowerCase());
        if(actual.toLowerCase()!==String(expected).toLowerCase()) return jsonResponse({error:'That email does not match the selected participant.'},401);
        const payload={sub:participant_id,name:p.name,is_test:isTestParticipant(p),exp:Date.now()+7*24*60*60*1000};
        const token=await makeSession(env.SESSION_SECRET,payload);
        const sr=await storeCall(env,participant_id,'state',{is_test:isTestParticipant(p)}); const state=await sr.json();
        return jsonResponse({session:{participant_id,name:p.name,is_test:isTestParticipant(p),votes:state.votes||{}}},200,{'set-cookie':sessionCookie(token)});
      }
      const session=await readSession(request,env);
      if(!session) return jsonResponse({error:'Authentication required.'},401);
      if(url.pathname==='/api/session' && request.method==='GET') {
        const sr=await storeCall(env,session.sub,'state',{is_test:session.is_test===true}); const state=await sr.json();
        return jsonResponse({session:{participant_id:session.sub,name:session.name,is_test:session.is_test===true,votes:state.votes||{}}});
      }
      if(url.pathname==='/api/votes' && request.method==='POST') {
        const body=await request.json(); const allowed=MATCHES[body.match_id];
        if(!allowed || allowed.round!==body.round || allowed.songs.length!==2 || !allowed.songs.includes(body.song_id)) return jsonResponse({error:'This vote does not match an active tournament matchup.'},400);
        const sr=await storeCall(env,session.sub,'vote',{match_id:body.match_id,round:body.round,song_id:body.song_id,is_test:session.is_test===true});
        const data=await sr.json(); return jsonResponse(data,sr.status);
      }
      if(url.pathname==='/api/logout' && request.method==='POST') {
        const sr=await storeCall(env,session.sub,'flush',{is_test:session.is_test===true}); if(!sr.ok) return jsonResponse({error:'Vote sync failed. Logout was cancelled so no data is lost.'},503);
        return jsonResponse({ok:true},200,{'set-cookie':clearCookie()});
      }
      return jsonResponse({error:'Not found.'},404);
    } catch(err) { console.error(err); return jsonResponse({error:'Server error.'},500); }
  }
};

export class ParticipantVoteStore {
  constructor(state, env) { this.state=state; this.env=env; }
  async fetch(request) {
    const action=new URL(request.url).pathname.slice(1); const body=await request.json().catch(()=>({}));
    if(body.participant_id) await this.state.storage.put('participant_id',body.participant_id);
    if(typeof body.is_test==='boolean') await this.state.storage.put('is_test',body.is_test);
    if(action==='state') { const votes=(await this.state.storage.get('votes'))||{}; return jsonResponse({votes}); }
    if(action==='vote') {
      const votes=(await this.state.storage.get('votes'))||{}; const existing=votes[body.match_id];
      if(existing) { if(existing.song_id===body.song_id) return jsonResponse({ok:true,idempotent:true,vote:existing}); return jsonResponse({error:'A vote has already been submitted for this matchup.'},409); }
      const isTest=(await this.state.storage.get('is_test'))===true;
      const vote={vote_submission_id:(isTest?'TESTVOTE-':'VOTE-')+crypto.randomUUID(),match_id:body.match_id,round:body.round,song_id:body.song_id,submitted_at:new Date().toISOString(),vote_pool:isTest?'test':'official',excluded_from_official_totals:isTest};
      votes[body.match_id]=vote; await this.state.storage.put('votes',votes); await this.state.storage.setAlarm(Date.now()+FIVE_MINUTES);
      return jsonResponse({ok:true,vote});
    }
    if(action==='flush') { try { await this.flushGit(); await this.state.storage.deleteAlarm(); return jsonResponse({ok:true}); } catch(e) { console.error(e); return jsonResponse({error:'Git sync failed.'},503); } }
    return jsonResponse({error:'Not found.'},404);
  }
  async alarm() { await this.flushGit(); }
  async flushGit() {
    const votes=(await this.state.storage.get('votes'))||{}; const participantId=(await this.state.storage.get('participant_id')) || 'participant';
    const isTest=(await this.state.storage.get('is_test'))===true;
    const payload={schema_version:2,tournament:'HMPP-2026',participant_id:participantId,vote_pool:isTest?'test':'official',excluded_from_official_totals:isTest,updated_at:new Date().toISOString(),votes};
    const path=isTest?`data/2026/test-votes/by-participant/${participantId}.json`:`data/2026/votes/by-participant/${participantId}.json`;
    await writeGitJson(this.env,path,payload,`${isTest?'Sync HMPP TEST votes':'Sync HMPP votes'}: ${participantId}`);
  }
}

async function writeGitJson(env,path,data,message) {
  if(!env.GITHUB_TOKEN || !env.GITHUB_REPO) throw new Error('GitHub mirror is not configured');
  const branch=env.GITHUB_BRANCH||'main'; const api=`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const headers={'authorization':`Bearer ${env.GITHUB_TOKEN}`,'accept':'application/vnd.github+json','user-agent':'HMPP-2026-Worker','x-github-api-version':'2022-11-28'};
  let sha; const current=await fetch(api+'?ref='+encodeURIComponent(branch),{headers}); if(current.ok) sha=(await current.json()).sha; else if(current.status!==404) throw new Error('GitHub read failed: '+current.status);
  const content=bytesToBase64(utf8(JSON.stringify(data,null,2)+'\n'));
  const body={message,content,branch,...(sha?{sha}:{})};
  let put=await fetch(api,{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(body)});
  if(put.status===409) { const latest=await fetch(api+'?ref='+encodeURIComponent(branch),{headers}); if(latest.ok) { body.sha=(await latest.json()).sha; put=await fetch(api,{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(body)}); } }
  if(!put.ok) throw new Error('GitHub write failed: '+put.status+' '+await put.text());
  return put.json();
}
