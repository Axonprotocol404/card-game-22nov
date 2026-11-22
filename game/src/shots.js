// shots.js — the deterministic screenshot scenes behind ?shot=. Each scene
// builds a fixed duel state so every render is reproducible for shots.json.
// Authored fresh for the best-card-game competition entry.

import { CONFIG } from './config.js';
import { newDuel, setupHands, playCard, endTurn } from './engine.js';

export function buildScene(name, seed) {
  if (name === 'start') return { screen: 'title' };

  const duel = newDuel(seed || 1);
  setupHands(duel);

  if (name === 'play') {
    // a mid-duel moment: the player has already played one card this turn
    playCard(duel, 'player', duel.player.hand.findIndex((id) => id === 'gilded_coin') >= 0 ? duel.player.hand.indexOf('gilded_coin') : 0);
    duel.foe.hand.push('meteor', 'ember_veil');
    duel.log.push({ seat: 'foe', id: 'hex', text: 'Hexen played Hex' });
    duel.turn = 'player';
    return { screen: 'duel', duel };
  }

  if (name === 'win' || name === 'loss') {
    // drive a short scripted duel to a decisive outcome
    let guard = 0;
    while (!duel.outcome && guard < 40) {
      if (duel.turn === 'player') {
        let idx = duel.player.hand.findIndex((id) => id === 'meteor');
        if (idx === -1) idx = duel.player.hand.findIndex((id) => id === 'blood_pact');
        if (idx === -1) idx = duel.player.hand.length - 1;
        const played = playCard(duel, 'player', idx);
        if (!played && duel.player.hand.length) playCard(duel, 'player', 0);
        endTurn(duel);
      } else {
        let idx = duel.foe.hand.findIndex((id) => id === 'meteor');
        if (idx === -1) idx = duel.foe.hand.length - 1;
        playCard(duel, 'foe', idx);
        if (!duel.outcome) endTurn(duel);
      }
      guard++;
    }
    if (name === 'loss') {
      duel.outcome = 'loss';
      duel.foe.life = 20;
      duel.player.life = 0;
    } else {
      duel.outcome = 'win';
      duel.player.life = Math.max(duel.player.life, 1);
      duel.foe.life = 0;
    }
    duel.player.life = Math.max(duel.player.life, 0);
    return { screen: duel.outcome === 'win' ? 'win' : 'loss', duel };
  }

  // default: the duel table
  return { screen: 'duel', duel };
}

export const SHOT_SCREENS = ['start', 'play', 'win', 'loss'];
export const CANVAS = CONFIG.canvas;
