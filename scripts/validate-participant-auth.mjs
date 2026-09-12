import fs from 'node:fs';
import path from 'node:path';

const [publicPath, secretPath] = process.argv.slice(2);
if (!publicPath || !secretPath) {
  console.error('Usage: node scripts/validate-participant-auth.mjs <public.json> <secret.json>');
  process.exit(2);
}
const pub = JSON.parse(fs.readFileSync(path.resolve(publicPath), 'utf8')).participants || [];
const raw = JSON.parse(fs.readFileSync(path.resolve(secretPath), 'utf8'));
const auth = raw.participants || raw;
const missing = pub.filter(p => {
  const e = auth[p.id];
  return !(typeof e === 'string' ? e : e?.email_sha256);
});
const extra = Object.keys(auth).filter(id => !pub.some(p => p.id === id));
console.log(`Participant auth coverage: ${pub.length - missing.length}/${pub.length}`);
if (missing.length) console.log('Missing:', missing.map(p => `${p.name} (${p.id})`).join(', '));
if (extra.length) console.log('Extra:', extra.join(', '));
if (missing.length) process.exit(1);
