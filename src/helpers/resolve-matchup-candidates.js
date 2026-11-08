/**
 * resolveMatchupCandidates - Dynamic Candidate Resolution Helper
 * 
 * Reads tournament state and resolves matchups for ANY round (play-ins, R64, R32, R16, etc.)
 * Dynamically discovers available rounds from the state object and processes all of them.
 * 
 * @param {Object} env - Worker environment (contains VOTES_DB binding)
 * @param {string} databaseId - Database identifier ('staging' | 'real-d1')
 * @param {boolean} writeMatches - Whether to write results to the matches table
 * @returns {Promise<Object>} Resolved matchups for all available rounds
 */

/**
 * Resolve all Play-In winners and construct complete matchups for ALL available rounds
 * Dynamically discovers and processes: play-ins, round-of-64, round-of-32, round-of-16, etc.
 * 
 * @param {Object} env - Worker environment (contains VOTES_DB binding)
 * @param {string} databaseId - Database identifier ('staging' | 'real-d1')
 * @param {boolean} writeMatches - Whether to write results to the matches table
 * @returns {Promise<Object>} Resolved matchups for all available rounds
 */
export async function resolveMatchupCandidates(env, databaseId = 'staging', writeMatches = false) {
  const state = await getTournamentState(env, databaseId);
  
  if (state.error) {
    throw new Error(`Failed to load tournament state: ${state.error}`);
  }

  // Build a map of Play-In results with resolved winners
  let playInResults = null;
  if (state.playInResults || state['play-in-results']) {
    playInResults = state.playInResults || state['play-in-results'];
  } else if (state.playIns || state['play-ins']) {
    const sourceData = state.playIns || state['play-ins'] || {};
    console.warn('[ResolveMatchupCandidates] Using transformed play-ins fallback');
    playInResults = Object.fromEntries(
      Object.entries(sourceData).map(([id, match]) => {
        let winner = null;
        if (typeof match === 'object' && match.winner) {
          winner = match.winner;
        } else if (typeof match === 'string') {
          console.warn(`[ResolveMatchupCandidates] Cannot resolve winner for ${id} from fallback data`);
        }
        return [id, {winner, loser: null, round: 'play-in'}];
      })
    );
  } else if (typeof state.playIns === 'object' && state.playIns) {
    // Fallback to raw play-ins as objects
    playInResults = state.playIns || {};
  }

  if (!playInResults || typeof playInResults !== 'object') {
    throw new Error('[ResolveMatchupCandidates] No Play-In results found in state');
  }

  // Build Play-In winner map
  const playinWinnerMap = {};
  for (const [playinId, result] of Object.entries(playInResults)) {
    if (result?.winner) {
      playinWinnerMap[playinId] = result.winner;
    }
  }
  
  // Dynamically discover all available round keys (play-ins, R64, R32, R16, etc.)
  const roundKeys = Object.keys(state).filter(k => {
    return k.includes('-of-') || k === 'play-ins';
  });

  // Map: round name > round data
  const roundsMap = {};
  for (const key of roundKeys) {
    if (key === 'play-ins') {
      continue; // Handled separately above
    }
    roundsMap[key] = state[key];
  }

  const allResolvedRounds = {};

  // Process each discovered round dynamically
  for (const [roundKey, roundData] of Object.entries(roundsMap)) {
    const resolvedRound = {};
    
    // Resolve -WINNER references in this round's matchups
    if (typeof roundData === 'object' && !Array.isArray(roundData)) {
      for (const [matchId, matchup] of Object.entries(roundData)) {
        let resolvedMatchup = { ...matchup };
        
        // Resolve slot_a if it references a Play-In winner
        if (typeof matchup.slot_a === 'string' && matchup.slot_a.endsWith('-WINNER')) {
          const playinRef = matchup.slot_a.replace('-WINNER', '');
          if (playinWinnerMap[playinRef]) {
            resolvedMatchup.slot_a = playinWinnerMap[playinRef];
            resolvedMatchup._resolved_from_playin = true;
          }
        }

        // Resolve slot_b similarly
        if (typeof matchup.slot_b === 'string' && matchup.slot_b.endsWith('-WINNER')) {
          const playinRef = matchup.slot_b.replace('-WINNER', '');
          if (playinWinnerMap[playinRef]) {
            resolvedMatchup.slot_b = playinWinnerMap[playinRef];
            resolvedMatchup._resolved_from_playin = true;
          }
        }

        resolvedRound[matchId] = resolvedMatchup;
      }
    }

    // Store the round if it has data
    if (Object.keys(resolvedRound).length > 0) {
      allResolvedRounds[roundKey] = resolvedRound;
    }
  }
  
  // Step 4: Enrich with candidate metadata (song IDs, participant info) for ALL rounds
  const enrichedCandidates = await enrichCandidatesWithMetadata(
    allResolvedRounds,
    state, // reference for song mappings if needed
    playinWinnerMap,
    writeMatches,
    env, // pass env for D1 writes when enabled
    databaseId
  );
  
  // Write matches to table if requested
  if (writeMatches) {
    await writeMatchesToD1(Object.values(enrichedCandidates), env, databaseId);
  }
  
  return {
    rounds: Object.keys(allResolvedRounds),
    matchups: enrichedCandidates,
    playinWinnersResolved: Object.keys(playinWinnerMap).length,
    totalMatches: Object.keys(allResolvedRounds).reduce((sum, k) => sum + Object.keys(allResolvedRounds[k]).length, 0),
    unresolvedReferences: [],
    metadata: {
      source: 'resolveMatchupCandidates',
      databaseId,
      resolvedAt: new Date().toISOString()
    }
  };
}

/**
 * Enrich resolved matchups with candidate metadata (song IDs, etc.)
 * Also writes consolidated results to the `matches` table if writeMatches=true
 */
async function enrichCandidatesWithMetadata(matchups, referenceData, playinWinners, writeMatches = false, env = null, databaseId = 'staging') {
  // Build matches table rows for all matchups
  const matchesRows = [];
  
  // Helper to get song ID for a candidate
  const getSongIdForCandidate = (submissionId, referenceData) => {
    // Defensive: handle cases where reference data is missing
    if (!referenceData || !referenceData.hardcodedSongMappings) {
      return submissionId; // Fallback to using submission ID directly
    }
    
    const hardcodedMappings = referenceData.hardcodedSongMappings;
    
    // Extract song ID from Play-In winner reference or direct mapping
    for (const [playinId, songs] of Object.entries(hardcodedMappings)) {
      if (typeof submissionId === 'string' && submissionId.includes(playinId)) {
        return songs[0]; // Return first song in the pair (winner's submission)
      }
    }
    
    // Fallback: derive from hardcoded values if found
    const hardcodedMatch = Object.entries(hardcodedMappings).find(([_, songs]) => {
      if (Array.isArray(songs) && typeof submissionId === 'string') return songs.includes(submissionId);
      return false;
    });
    
    return hardcodedMatch ? hardcodedMatch[1].join(' OR ') : submissionId;
  };
  
  // Helper to load candidate guesses
  const loadCandidateGuesses = async (submissionId) => {
    // Mock data - in production, fetch from env.VOTES_DB
    const mockSubmissions = {
      'SUB26-019': { guesses: ['guess_1', 'guess_2'] },
      'SUB26-042': { guesses: ['guess_3', 'guess_4'] },
      'SUB26-052': { guesses: ['guess_5', 'guess_6'] },
      'SUB26-051': { guesses: ['guess_7', 'guess_8'] },
      'SUB26-069': { guesses: ['guess_9', 'guess_10'] },
      'SUB26-028': { guesses: ['guess_11', 'guess_12'] },
      'SUB26-044': { guesses: ['guess_13', 'guess_14'] },
      'SUB26-066': { guesses: ['guess_15', 'guess_16'] },
      // Add more mock data as needed for testing
    };
    
    return mockSubmissions[submissionId] || { guesses: [], song_id: submissionId };
  };
  
  // Helper to write matches to D1
  const writeMatchesToD1 = async (matchesRows, env, databaseId) => {
    if (!env || !env.VOTES_DB || !writeMatches) {
      console.log('[ResolveMatchupCandidates] Skipping matches table write (writeMatches disabled or no VOTES_DB)');
      return;
    }
    
    const db = env.VOTES_DB;
    for (const row of matchesRows) {
      await db.prepare(`
        INSERT OR REPLACE INTO matches (
          match_id, round, song1_id, votes_song1, song2_id, votes_song2, winner
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).execute({
        match_id: row.match_id,
        round: row.round,
        song1_id: row.song1_id,
        votes_song1: row.votes_song1,
        song2_id: row.song2_id,
        votes_song2: row.votes_song2,
        winner: row.winner
      });
    }
    
    console.log(`[ResolveMatchupCandidates] Wrote ${matchesRows.length} rows to matches table`);
  };
  
  // Main enrichment loop - process ALL rounds from the input object
  const enriched = {};
  
  for (const [matchId, matchup] of Object.entries(matchups)) {
    // Extract round from the matchup if it exists, otherwise default to 'unknown'
    let roundName = 'unknown';
    if (matchup.round) {
      roundName = matchup.round;
    }
    
    const slotACandidate = {
      id: matchup.slot_a,
      type: typeof matchup.slot_a === 'string' && matchup.slot_a.endsWith('-WINNER') 
        ? 'playin_winner' 
        : 'direct',
      songId: getSongIdForCandidate(matchup.slot_a, referenceData),
      guesses: await loadCandidateGuesses(matchup.slot_a) // simulate fetching from D1
    };
    
    const slotBCandidate = {
      id: matchup.slot_b,
      type: typeof matchup.slot_b === 'string' && matchup.slot_b.endsWith('-WINNER')
        ? 'playin_winner'
        : 'direct',
      songId: getSongIdForCandidate(matchup.slot_b, referenceData),
      guesses: await loadCandidateGuesses(matchup.slot_b)
    };
    
    // Count votes for each candidate based on their guesses
    const votesSong1 = (slotACandidate.guesses || []).length;
    const votesSong2 = (slotBCandidate.guesses || []).length;
    
    // Determine winner: prefer resolved Play-In winner, otherwise use vote count
    let winner = null;
    if (matchup._resolved_from_playin) {
      // Use the resolved Play-In winner as the match winner
      const playinId = Object.keys(playinWinners).find(pid => playinWinners[pid] === slotACandidate.id);
      winner = playinId ? playinWinners[playinId] : slotACandidate.id;
    } else if (votesSong1 > votesSong2) {
      winner = slotACandidate.songId;
    } else if (votesSong2 > votesSong1) {
      winner = slotBCandidate.songId;
    }
    
    // Build match row for the matches table with dynamic round name
    const matchRow = {
      match_id: matchId,
      round: roundName,
      song1_id: slotACandidate.songId,
      votes_song1: votesSong1,
      song2_id: slotBCandidate.songId,
      votes_song2: votesSong2,
      winner: winner || slotACandidate.id // default to slot_a if tie/unknown
    };
    
    matchesRows.push(matchRow);
    
    enriched[matchId] = {
      slot_a: slotACandidate,
      slot_b: slotBCandidate,
      round: roundName
    };
  }
  
  // Write to D1 if requested
  await writeMatchesToD1(matchesRows, env, databaseId);
  
  return enriched;
}

/**
 * Get tournament state (reads from mock file or real D1)
 */
async function getTournamentState(env, databaseId = 'staging') {
  const fs = await import('fs');
  const path = await import('path');
  
  const basePath = '/media/user/WD Black/projects/Pied-Piper-Tournament-of-Champions/data/state';
  
  if (databaseId === 'real-d1') {
    // TODO: Implementation for production - use env.VOTES_DB binding
    throw new Error('Real D1 access requires migration to complete');
  } else {
    const stateFile = path.join(basePath, 'tournament_state_static.json');
    
    if (!fs.existsSync(stateFile)) {
      console.error('[ResolveMatchupCandidates] State file not found:', stateFile);
      return { error: 'State file not found' };
    }
    
    const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    
    // Accept both naming conventions (play-ins/playIns) for flexibility
    const hasPlayIns = stateData.playIns || stateData['play-ins'] || stateData.play_in;
    
    if (!hasPlayIns && !stateData.roundOf64) {
      throw new Error('Invalid tournament state structure');
    }
    
    return {
      ...stateData,
      _metadata: {
        source: 'mock-d1',
        databaseId,
        lastUpdated: stateData._meta?.created || 'unknown'
      }
    };
  }
}
