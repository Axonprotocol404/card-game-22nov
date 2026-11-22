// The Hexen's mind: it plays by simulation, never by guesswork. Every candidate line — each
// affordable card, in each order that matters — is tried against a CLONE of the true duel, so the
// AI sees the exact outcome before committing. It scores each line with the same value function a
// strong player would use: damage dealt matters most, then favor economy, ward and hand size,
// with a life-leverage term that makes it push hard when the player is low.
//
// It commits to the best one-card line, plays it, and repeats: greedy one-ply with exact
// simulation is honest, fast, and plays recognizably well — it saves finishers for lethal, holds
// ward when threatened, and dumps Moon Letters into empty hands.

import { CARDS } from './cards.js';
import { cardCost, EVENT_OVER, playCard, endTurn } from './engine.js';

/** A deep copy of the duel: the AI mutates the copy freely. */
function cloneDuel(duel) {
  return {
    random: duel.random,
    player: cloneSide(duel.player),
    foe: cloneSide(duel.foe),
    turn: duel.turn,
    turnNumber: duel.turnNumber,
    plane: duel.plane,
    planeMax: duel.planeMax,
    log: [],
    over: duel.over,
    winner: duel.winner,
    turnCount: duel.turnCount,
  };
}

function cloneSide(side) {
  return {
    name: side.name,
    life: side.life,
    ward: side.ward,
    favor: side.favor,
    draw: side.draw.slice(),
    hand: side.hand.slice(),
    discard: side.discard.slice(),
    playedThisTurn: side.playedThisTurn.slice(),
    lastCardPlayed: side.lastCardPlayed,
    hexCost: side.hexCost,
  };
}

/** How good the position looks for `who` after the duel state reached. Higher is better. */
function evaluate(duel, who) {
  const me = duel[who];
  const them = duel[who === 'player' ? 'foe' : 'player'];
  let score = 0;
  score += (them.life <= 0 ? 10000 : 0) - (me.life <= 0 ? 10000 : 0);
  score += (them.life - me.life) * 6;
  if (me.life <= 10) score -= (11 - me.life) * 8;
  if (them.life <= 10) score += (11 - them.life) * 10;
  score += me.favor * 3 - them.favor * 3;
  score += me.ward * 2.5 - them.ward * 2.5;
  score += me.hand.length * 2 - them.hand.length * 2;
  score += me.draw.length * 0.3 - them.draw.length * 0.3;
  score += duel.plane * 1.5;
  return score;
}

/** Every hand card the side could legally play right now, cheapest first. */
function legalMoves(duel) {
  const side = duel[duel.turn];
  const moves = [];
  for (let i = 0; i < side.hand.length; i += 1) {
    const id = side.hand[i];
    if (cardCost(duel, id) <= duel.plane) moves.push({ index: i, id });
  }
  moves.sort((a, b) => CARDS[a.id].cost - CARDS[b.id].cost);
  return moves;
}

/** The AI's whole decision: the best card to play now, or null to end the turn. */
export function chooseMove(duel) {
  const who = duel.turn;
  const baseline = cloneDuel(duel);
  const moves = legalMoves(duel);
  let best = null;
  let bestScore = evaluate(baseline, who) - 4; // ending the turn is always on the table

  for (const move of moves) {
    const trial = cloneDuel(duel);
    playCard(trial, move.index);
    // After the card, look one card further when cheap follow-ups exist: a two-card line often
    // outshines either card alone, so the AI prefers real combos over isolated plays.
    let score = evaluate(trial, who);
    if (!trial.over) {
      const followUps = legalMoves(trial);
      if (followUps.length > 0) {
        let bestFollow = -Infinity;
        for (const follow of followUps.slice(0, 6)) {
          const t2 = cloneDuel(trial);
          playCard(t2, follow.index);
          const s2 = t2.over && t2.winner === who ? 10000 : evaluate(t2, who);
          if (s2 > bestFollow) bestFollow = s2;
        }
        score = score * 0.35 + bestFollow * 0.65;
      }
    } else if (trial.winner === who) {
      score = 100000;
    }
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

/** Play the chosen move on the real duel; the caller then re-renders. */
export function takeMove(duel) {
  const move = chooseMove(duel);
  if (!move) {
    endTurn(duel);
    return null;
  }
  playCard(duel, move.index);
  return move;
}
