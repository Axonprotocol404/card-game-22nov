// ai.js — the Hexen's brain: simulation-based, not heuristic. Each candidate
// card is played on a deep clone of the duel, scored with the engine's value
// function; the choice looking one card further prefers real two-card combos.
// Authored fresh for the best-card-game competition entry.

import { CARDS } from './cards.js';
import { playCard, endTurn, evaluate, canPlay } from './engine.js';

function cloneDuel(duel) {
  // structured clone of the plain-data duel; the rng closure is dropped, so
  // simulated branches must not depend on future draws being exact — the
  // engine tolerates that (draws from remaining deck arrays are cloned anyway).
  return structuredClone(duel);
}

// score playing card `index` now, then (optionally) the best follow-up
function scoreLine(duel, index, lookahead) {
  const sim = cloneDuel(duel);
  const played = playCard(sim, 'foe', index);
  if (played === null) return -Infinity;
  let best = evaluate(sim, 'foe');
  if (lookahead) {
    let after = -Infinity;
    for (let j = 0; j < sim.foe.hand.length; j++) {
      if (!canPlay(sim, 'foe', j)) continue;
      const again = playCard(sim, 'foe', j);
      if (again === null) continue;
      after = Math.max(after, evaluate(sim, 'foe'));
    }
    if (after !== -Infinity) best = Math.max(best * 1.02, after * 0.95);
  }
  return best;
}

// pick and play the Hexen's whole turn: cards while affordable and worth it.
export function foeTurn(duel) {
  let played = 0;
  while (played < 4 && duel.turn === 'foe' && !duel.outcome) {
    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < duel.foe.hand.length; i++) {
      if (!canPlay(duel, 'foe', i)) continue;
      const s = scoreLine(duel, i, played < 2);
      if (s > bestScore) {
        bestScore = s;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) break;
    // never play a card whose score is worse than holding (life is the baseline)
    const baseline = evaluate(cloneDuel(duel), 'foe');
    if (bestScore < baseline - 2 && played > 0) break;
    playCard(duel, 'foe', bestIndex);
    played += 1;
  }
  if (duel.turn === 'foe' && !duel.outcome) endTurn(duel);
}

export const AI_CARD_HINTS = CARDS;
