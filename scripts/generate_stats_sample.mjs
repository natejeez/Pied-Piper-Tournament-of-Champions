import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const OUTPUT = resolve(process.argv[2] || 'web/data/2026/stats/play-in-sample.json');
const SEED = 20260916;

const participants = Array.from({ length: 9 }, (_, index) => ({
  id: `hm-${String(index + 1).padStart(2, '0')}`,
  name: `Harry Man ${String(index + 1).padStart(2, '0')}`
}));

const ownerOrder = ['hm-03','hm-02','hm-06','hm-01','hm-07','hm-04','hm-07','hm-08','hm-09','hm-05','hm-04','hm-08','hm-06','hm-03','hm-09','hm-01'];
const songs = Array.from({ length: 16 }, (_, index) => ({
  id: `SAMPLE-SONG-${String(index + 1).padStart(3, '0')}`,
  title: `Sample Track ${String(index + 1).padStart(2, '0')}`,
  artist: `Sample Artist ${String(index + 1).padStart(2, '0')}`,
  owner_id: ownerOrder[index]
}));

const matches = Array.from({ length: 8 }, (_, index) => ({
  id: `PI${String(index + 1).padStart(2, '0')}`,
  round: 'play-in',
  song_ids: [songs[index * 2].id, songs[index * 2 + 1].id]
}));

function rng(seed) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
}

const random = rng(SEED);
const skill = new Map([
  ['hm-01', .58], ['hm-02', .42], ['hm-03', .36], ['hm-04', .66], ['hm-05', .51],
  ['hm-06', .73], ['hm-07', .31], ['hm-08', .48], ['hm-09', .61]
]);
const ballots = [];

for (const participant of participants) {
  for (const match of matches) {
    const selected_song_id = match.song_ids[random() < .5 ? 0 : 1];
    const guesses = match.song_ids.map(song_id => {
      const truth = songs.find(song => song.id === song_id).owner_id;
      let guessed_participant_id = truth;
      if (random() > skill.get(participant.id)) {
        const alternatives = participants.filter(p => p.id !== truth);
        guessed_participant_id = alternatives[Math.floor(random() * alternatives.length)].id;
      }
      return { song_id, guessed_participant_id };
    });
    ballots.push({
      voter_id: participant.id,
      match_id: match.id,
      selected_song_id,
      guesses
    });
  }
}

const payload = {
  schema_version: 1,
  sample_id: 'HMPP-2026-PLAYIN-STATS-SAMPLE-V1',
  generated_at: '2026-09-16T00:00:00.000Z',
  generator_seed: SEED,
  tournament_id: 'HMPP-2026',
  round: { id: 'play-in', label: 'Play-in', sequence: 0, status: 'closed' },
  visibility: 'test-only',
  excluded_from_official_totals: true,
  participants,
  songs,
  matches,
  ballots
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${ballots.length} ballots and ${ballots.length * 2} guesses to ${OUTPUT}`);
