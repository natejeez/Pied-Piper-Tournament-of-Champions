/**
 * Mock D1 State Reader for Testing
 * 
 * Reads from data/state/tournament_state_static.json as if it were a D1 database.
 * Used to verify candidate generation logic before real D1 migration.
 */

const fs = require('fs');
const path = require('path');

/**
 * Simulate getting tournament state from D1
 * In production: reads from Cloudflare D1 binding
 * In testing: reads from static JSON file
 */
export async function getTournamentState(env, databaseId = 'staging') {
  const basePath = path.join('/media/user/WD Black/projects/Pied-Piper-Tournament-of-Champions', 'data/state');
  
  if (databaseId === 'real-d1') {
    // Production path - would use env.VOTES_DB here
    throw new Error('Real D1 access not implemented in mock mode');
  } else {
    // Mock mode - read from static file
    const stateFile = path.join(basePath, 'tournament_state_static.json');
    
    if (!fs.existsSync(stateFile)) {
      console.error('[MockD1] State file not found:', stateFile);
      return { error: 'State file not found' };
    }
    
    const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    
    // Validate required fields
    if (!stateData.playIns && !stateData.roundOf64) {
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

/**
 * Simulate fetching Play-In results from D1
 */
export async function getPlayInResults() {
  const state = await getTournamentState({ VOTE_STORAGE_BACKEND: 'd1' });
  
  if (state.error) {
    throw new Error(`D1 error: ${state.error}`);
  }
  
  // Simulate Play-In results from the static data
  const playIns = state.playIns || {};
  
  return Object.entries(playIns).map(([playinId, matchup]) => {
    if (matchup.status === 'scheduled') {
      // In a real scenario, we'd fetch from D1 after votes are cast
      // For now, return the matchup definition
      return {
        playinId,
        slotA: matchup.slot_a_submission_id,
        slotB: matchup.slot_b_submission_id,
        status: matchup.status
      };
    } else if (matchup.status === 'complete') {
      return {
        playinId,
        winner: matchup.winner || matchup.slot_a_submission_id, // fallback to slot A if unknown
        loser: matchup.loser || matchup.slot_b_submission_id,
        round: matchup.round || 'play-in'
      };
    }
  });
}

/**
 * Simulate fetching Round-of-64 matchups with winner resolution
 */
export async function getRound64Matchups() {
  const state = await getTournamentState({ VOTE_STORAGE_BACKEND: 'd1' });
  
  if (state.error) {
    throw new Error(`D1 error: ${state.error}`);
  }
  
  // Resolve Play-In winners from the mock D1 results
  const playInResults = state.playInResults || {};
  const resolvedMatchups = {};
  
  const r64Matches = state.roundOf64 || {};
  
  for (const [matchId, matchup] of Object.entries(r64Matches)) {
    // Handle Play-In winner references
    if (matchup.slot_a.includes('-WINNER')) {
      const playinMatch = matchId.split('M')[1]?.padStart(2, '0') || ''; // Simplified extraction
      const resolvedWinner = resolvePlayInWinner(playinMatch, playInResults);
      
      resolvedMatchups[matchId] = {
        ...matchup,
        slot_a: resolvedWinner,
        _resolved_from_playin: true
      };
    } else if (matchup.slot_b.includes('-WINNER')) {
      // Would handle if Play-In winner was in slot B
      const playinMatch = matchId.split('M')[1]?.padStart(2, '0') || '';
      const resolvedWinner = resolvePlayInWinner(playinMatch, playInResults);
      
      resolvedMatchups[matchId] = {
        ...matchup,
        slot_b: resolvedWinner,
        _resolved_from_playin: true
      };
    } else {
      // Direct entry - no resolution needed
      resolvedMatchups[matchId] = matchup;
    }
  }
  
  return resolvedMatchups;
}

/**
 * Helper to resolve Play-In winner from results
 */
function resolvePlayInWinner(playinId, playInResults) {
  const playinKey = `PI${String(parseInt(playinId.replace('PI', '')) || 1)}`;
  
  // Check if we have actual results for this Play-In
  const result = playInResults[playinKey];
  
  if (result?.winner) {
    return result.winner;
  }
  
  // Fallback: use first slot as winner (deterministic for testing)
  return `SUB26-XXX-FALLBACK-${playinKey}`;
}

/**
 * Get Play-In matchup by ID
 */
export function getPlayInMatchup(playinId) {
  const state = getTournamentStateSync();
  return state.playIns?.[playinId];
}

// Synchronous version for quick reference
function getTournamentStateSync() {
  const basePath = '/media/user/WD Black/projects/Pied-Piper-Tournament-of-Champions/data/state';
  const stateFile = path.join(basePath, 'tournament_state_static.json');
  
  if (!fs.existsSync(stateFile)) {
    throw new Error(`State file not found: ${stateFile}`);
  }
  
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}
