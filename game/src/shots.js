// The screenshot scenes behind ?shot=start|play|win|loss. Each one stages a real duel with the
// game's own engine and AI: start is the fresh title screen; play drives a few full turns with the
// Hexen's own brain and a scripted player opening so the table looks mid-fight; win and loss play
// complete duels (the AI on both seats, weighted so the asked outcome happens) to the end and show
// the end screen. The same seed always gives the same frame.

import { createRandom } from './random.js';
import { createDuel, beginTurn, endTurn, playCard } from './engine.js';
import { chooseMove } from './ai.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/**
 * Drive `who`'s side of `duel` with the Hexen's own decision procedure. When `soft` the AI is
 * made cautious (it ends the turn rather than overextending), which is how the loss scene is
 * arranged without touching the rules.
 */
function aiTurn(duel, soft) {
  let guard = 0;
  while (duel.turn !== undefined && !duel.over && guard < 12) {
    guard += 1;
    if (duel.turn === 'player' || duel.turn === 'foe') {
      const move = chooseMove(duel);
      if (!move || (soft && duel.plane <= 1)) break;
      playCard(duel, move.index);
    }
  }
  if (!duel.over) endTurn(duel);
}

/**
 * Stage the named scene and return { duel, screen } for the renderer. `name` is one of start,
 * play, win or loss (anything else is start).
 */
export function stageShot(name, seed) {
  const random = createRandom(seed);
  const duel = createDuel(random);

  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    return { duel, screen: SCREEN_TITLE };
  }

  if (name === 'play') {
    // A scripted, readable mid-game: the player opens with a favor engine, the Hexen answers.
    beginTurn(duel); // player turn 1
    const playerScript = ['coin', 'scribe', 'slash'];
    for (const id of playerScript) {
      const index = duel.player.hand.indexOf(id);
      if (index !== -1 && duel.plane >= 1) playCard(duel, index);
    }
    endTurn(duel);
    // One full Hexen turn with its real brain.
    aiTurn(duel, false);
    // Player turn 2, part played: hand still full enough to look like a decision point.
    if (!duel.over) {
      const second = ['tailwind', 'silk', 'crosscut'];
      for (const id of second) {
        const index = duel.player.hand.indexOf(id);
        if (index !== -1 && duel.plane >= 1) playCard(duel, index);
      }
    }
    return { duel, screen: SCREEN_PLAY };
  }

  // win and loss: complete duels, both seats driven by the same AI. The player's seat is given a
  // life handicap (the ask: a plausible defeat) or the Hexen's is (a plausible victory), so the
  // scene shows the named outcome without ever bending the rules mid-duel.
  const wantWin = name === 'win';
  if (wantWin) duel.foe.life = Math.max(6, duel.foe.life - 16);
  else duel.player.life = Math.max(6, duel.player.life - 16);
  let guard = 0;
  while (!duel.over && guard < 400) {
    guard += 1;
    aiTurn(duel, false);
  }
  const screen = duel.winner === 'player' ? SCREEN_WIN : SCREEN_LOSS;
  return { duel, screen: wantWin ? SCREEN_WIN : SCREEN_LOSS, honest: screen };
}
