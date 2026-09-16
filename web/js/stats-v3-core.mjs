export function seededRandom(seed) {
  let state = (Number(seed) >>> 0) || 0x6d2b79f5;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(items, random) {
  return items[Math.floor(random() * items.length) % items.length];
}

function topThreeGuessers(guesses, participantById) {
  const counts = new Map();
  guesses.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
  return [...counts.entries()]
    .map(([participant_id, count]) => ({
      participant_id,
      name: participantById.get(participant_id)?.name || participant_id,
      count
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3);
}

export function simulateRound({ round, matches, participants, seed = Date.now(), activeUser = { id:'test-voter', name:'Test Voter' } }) {
  const voters = participants.filter(p => !p.is_test && p.id !== 'test-voter');
  if (!voters.length) throw new Error('No tournament participants are available for simulation.');
  const guessTargets = voters;
  const participantById = new Map(guessTargets.map(p => [p.id, p]));
  const random = seededRandom(seed);

  const simulatedMatches = matches.map(match => {
    if (!Array.isArray(match.songs) || match.songs.length !== 2) throw new Error(`Match ${match.id} must contain exactly two songs.`);
    const [songA, songB] = match.songs;
    const votes = { [songA.id]:0, [songB.id]:0 };
    const guessBuckets = { [songA.id]:[], [songB.id]:[] };

    const ballots = voters.map(voter => {
      const selected_song_id = random() < 0.5 ? songA.id : songB.id;
      votes[selected_song_id] += 1;
      const guesses = [songA, songB].map(song => {
        const guessed_participant_id = pick(guessTargets, random).id;
        guessBuckets[song.id].push(guessed_participant_id);
        return { song_id:song.id, guessed_participant_id };
      });
      return { participant_id:voter.id, match_id:match.id, selected_song_id, guesses };
    });

    const activeSelectedSong = random() < 0.5 ? songA.id : songB.id;
    const activeGuesses = [songA, songB].map(song => ({
      song_id:song.id,
      guessed_participant_id:pick(guessTargets, random).id
    }));

    const winner_song_id = votes[songA.id] > votes[songB.id] ? songA.id : songB.id;
    const totalVotes = votes[songA.id] + votes[songB.id];
    const margin = Math.abs(votes[songA.id] - votes[songB.id]);

    const songs = [songA, songB].map(song => ({
      ...song,
      vote_count:votes[song.id],
      vote_share:totalVotes ? votes[song.id] / totalVotes : 0,
      top_guesses:topThreeGuessers(guessBuckets[song.id], participantById),
      active_user_guess:activeGuesses.find(g => g.song_id === song.id)?.guessed_participant_id || null,
      active_user_guess_name:participantById.get(activeGuesses.find(g => g.song_id === song.id)?.guessed_participant_id)?.name || ''
    }));

    return {
      id:match.id,
      round,
      winner_song_id,
      total_votes:totalVotes,
      margin,
      ballots,
      active_user_ballot:{
        participant_id:activeUser.id,
        participant_name:activeUser.name,
        selected_song_id:activeSelectedSong,
        guesses:activeGuesses
      },
      songs
    };
  });

  return {
    schema_version:'hmpp-v3-sim-1',
    simulated:true,
    round,
    seed:Number(seed) >>> 0,
    generated_at:new Date().toISOString(),
    voter_count:voters.length,
    active_user:activeUser,
    matches:simulatedMatches
  };
}

export function summarizeRound(data) {
  const matches = data?.matches || [];
  if (!matches.length) return { match_count:0, voter_count:data?.voter_count || 0, closest:null, widest:null, average_margin:0, most_guessed:null };
  const byMargin = [...matches].sort((a, b) => a.margin - b.margin || a.id.localeCompare(b.id));
  const aggregate = new Map();
  matches.forEach(match => match.songs.forEach(song => song.top_guesses.forEach(g => aggregate.set(g.name, (aggregate.get(g.name) || 0) + g.count))));
  const mostGuessed = [...aggregate.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0] || null;
  return {
    match_count:matches.length,
    voter_count:data.voter_count,
    closest:{ id:byMargin[0].id, margin:byMargin[0].margin },
    widest:{ id:byMargin[byMargin.length-1].id, margin:byMargin[byMargin.length-1].margin },
    average_margin:matches.reduce((sum,m)=>sum+m.margin,0)/matches.length,
    most_guessed:mostGuessed ? { name:mostGuessed[0], count:mostGuessed[1] } : null
  };
}
