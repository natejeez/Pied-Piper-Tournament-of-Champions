# Candidate Generation Analysis & Refactoring Plan

**Date:** 2026-11-06  
**Purpose:** Identify hardcoded vs dynamic candidate generation and document the refactoring path for D1 migration

---

## Executive Summary

The tournament uses a hybrid architecture:
- ✅ **Dynamic**: Vote/guess storage via `ParticipantVoteStore` Durable Objects (transitioning to D1)
- ❌ **Hardcoded**: Candidate generation logic in multiple worker versions via static data structures

**Goal:** Refactor candidate generation to pull existing votes and tournament state from D1/CSV before generating next-round candidates.

---

## Current State: Hardcoded Logic Locations

### 1. `worker-v29.js` - Root of Hardcoding
**Location:** Lines ~40-75  
**Mechanism:** Static `MATCHES` object maps rounds to hardcoded song submissions

```javascript
const MATCHES = {
  "PI01": {"round": "play-in", "songs": ["SONG26-019", "SONG26-016"]},
  "PI02": {"round": "play-in", "songs": ["SONG26-042", "SONG26-001"]},
  // ... PI03-PI08 ...
  "M001": {"slot_a": "SUB26-046", "slot_b": "SUB26-061"},
  // ... M002-M012, M015-M032 (direct entries) ...
  "M003": {"slot_a": "PI01-WINNER", "slot_b": "SUB26-055"},
  // ... M005, M013, M014, M019, M024, M026, M027, M032 (Play-In winners) ...
}
```

**Functions using `MATCHES`:**
- `buildR64(a.results)` - Constructs Round-of-64 lineup
- Admin publish-endpoints call `buildR64()` to populate state

### 2. `worker-v28.js` → `worker-v24.js` - Progressive Refactoring Attempts
Each iteration moved hardcoded data outward but retained the pattern:
- Attempted CSV fallbacks in comments/structure
- Still relied on static song ID mappings
- Never implemented dynamic winner resolution from D1

### 3. `worker-v23.js` - Final State Before Current Production
**Lines ~48-65:** Admin endpoints still invoke hardcoded logic:
```javascript
const matchups = buildR64(a.results); // Uses static MATCHES object
state.published_matchups['round-of-64'] = matchups;
```

**Critical Gap:** Play-In winner references (`PI01-WINNER`) in CSV are never resolved against actual D1 vote state.

---

## Dynamic Components (Already Working)

### ✅ `ParticipantVoteStore` (Durable Objects → D1)
- Atomic writes with `(participant_id, match_id)` composite key
- Conflict detection returns `409`
- Idempotent retries
- Aggregation via `aggregate()` endpoint

### ✅ CSV Tournament State (Static Reference)
**`play-ins.csv`:**
| playin_id | slot_a_submission_id | slot_b_submission_id | status |
|-----------|---------------------|----------------------|--------|
| PI01      | SUB26-019           | SUB26-016            | scheduled |
| PI02      | SUB26-042           | SUB26-001            | scheduled |

**`matches-r64.csv`:**
| match_id | slot_a             | slot_b   |
|----------|--------------------|----------|
| M003     | PI01-WINNER        | SUB26-055 |
| M005     | PI03-WINNER        | SUB26-072 |

⚠️ **The CSV references winners (`PI01-WINNER`) but the Worker never resolves them against D1 data.**

---

## Refactoring Plan

### Phase 1: Add Dynamic Candidate Resolution Function

**New function:** `resolveMatchupCandidates(env, matchupId)`  
**Location:** `src/worker-<version>.js` (new helper file or inline)

```javascript
async function resolveMatchupCandidates(env, roundName) {
  // Fetch tournament state from D1 (or CSV fallback)
  const state = await getTournamentState(env);
  
  // Parse matchup definitions dynamically
  const playIns = await parseCSVFile('data/2026/bracket/play-ins.csv');
  const r64Matches = await parseCSVFile('data/2026/bracket/matches-r64.csv');
  
  // Resolve Play-In winners from D1 before building R64
  const playInResults = state.results['play-in'] || [];
  const winnersBySlot = {};
  
  for (const pi of playIns) {
    if (pi.status === 'complete') {
      // Find winner in playInResults by submission_id
      const slotAWinner = playInResults.find(v => v.match_id === pi.playin_id && v.slot_a === true)?.song_id;
      const slotBWinner = playInResults.find(v => v.match_id === pi.playin_id && v.slot_b === true)?.song_id;
      winnersBySlot[pi.playin_id] = { winner: slotAWinner || slotBWinner, slot_a_winner: slotAWinner, slot_b_winner: slotBWinner };
    }
  }
  
  // Build R64 with resolved winners
  const matchups = r64Matches.map(m => {
    let slotA, slotAType;
    if (m.slot_a.includes('-WINNER')) {
      const piMatch = m.slot_a.replace('-WINNER', '');
      const winnerData = winnersBySlot[piMatch];
      slotA = winnerData?.winner || '';
      slotAType = 'playin_winner';
    } else {
      slotA = m.slot_a;
      slotAType = m.slot_a_type;
    }
    
    return { match_id: m.match_id, slot_a: slotA, slot_b: m.slot_b };
  });
  
  return { matchups, winnersBySlot };
}
```

### Phase 2: Refactor Admin Endpoints

**Remove:** Static `MATCHES` object from `worker-v23.js` (~lines 48-65)  
**Replace:** Dynamic resolution call

```javascript
// BEFORE (hardcoded)
const matchups = buildR64(a.results); // Uses static MATCHES

// AFTER (dynamic)
const { matchups, winnersBySlot } = await resolveMatchupCandidates(env, 'play-in');
state.published_matchups['round-of-64'] = matchups;
```

### Phase 3: Generalize for Future Rounds

Extend the pattern to subsequent rounds (Quarter-Finals, Semi-Finals, Finals):

```javascript
async function generateNextRoundCandidates(env, completedRounds) {
  const state = await getTournamentState(env);
  
  // For each round not yet complete
  for (const round of ['round-of-64', 'quarter-finals', 'semi-finals', 'finals']) {
    if (!state.results[round]) continue; // Skip incomplete rounds
    
    // Resolve winners from previous round's D1 state
    const previousRound = getPreviousRoundName(round); // e.g., 'play-in' → 'round-of-64'
    const winnersFromPrevious = await resolveMatchupCandidates(env, previousRound);
    
    // Use CSV template or generate bracket structure dynamically
    // (This would require a separate bracket structure definition)
    
    // Populate next-round candidates with resolved winners
  }
}
```

### Phase 4: Migration to D1 for Bracket Structure

**Option A:** Keep CSV as static reference, read from disk in Worker  
- Simpler, no schema changes needed  
- Requires file system access (may need to move files to R2 or use D1 blobs)

**Option B:** Migrate bracket structure to D1 table  
```sql
CREATE TABLE matchup_structure (
  match_id TEXT PRIMARY KEY,
  round TEXT NOT NULL,
  slot_a_type TEXT NOT NULL, -- 'direct', 'playin_winner', etc.
  slot_b_type TEXT NOT NULL,
  slot_a_reference TEXT,     -- SUB26-XXX or PI01-WINNER reference
  slot_b_reference TEXT,
  status TEXT DEFAULT 'scheduled'
);
```

**Recommendation:** Start with Option A (CSV) during migration; migrate bracket structure to D1 separately if performance requires it.

---

## Implementation Checklist

- [ ] Create `resolveMatchupCandidates()` helper function
- [ ] Remove static `MATCHES` object from production workers
- [ ] Refactor `/api/admin/publish-round` endpoint to use dynamic resolution
- [ ] Add winner resolution logic for Play-In → R64 transition
- [ ] Update admin documentation to reflect dynamic workflow
- [ ] Test with staging D1 database before production cutover
- [ ] Verify Play-In completion triggers correct R64 candidate generation
- [ ] Ensure backward compatibility during phased rollout

---

## Risk Assessment

### Low Risk
- CSV-based resolution (no schema changes)
- Feature flag for dynamic vs static mode

### Medium Risk
- Winner resolution fails for tied/unresolved Play-Ins  
  **Mitigation:** Fall back to pre-populated state, surface error in logs

### High Risk
- Removing `MATCHES` object before testing complete refactoring  
  **Mitigation:** Keep static version deployed alongside dynamic until verified

---

## Next Steps

1. **Immediate:** Create `resolveMatchupCandidates()` helper with CSV fallback
2. **Staging:** Test on staging D1 database with current Play-In data
3. **Documentation:** Update `D1_MIGRATION.md` to include candidate generation changes
4. **Production:** Deploy refactored workers after staging validation
5. **Future:** Generalize to additional rounds once R64 dynamic flow is stable

---

**Analysis completed.** The hardcoded logic is confined to the `MATCHES` object and functions that use it. Refactoring this to dynamic resolution via D1/CSV state will enable proper tournament progression beyond hardcoded round 1.