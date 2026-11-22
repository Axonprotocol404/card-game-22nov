// engine.js — the rules of Hexen Duel: plane, ward, favor, damage and every
// card effect. Pure logic, no DOM. A duel is plain data; playing a card
// mutates it and appends to the log so render/ai can both read the same state.
// Authored fresh for the best-card-game competition entry.

import { CONFIG } from './config.js';
import { CARDS } from './cards.js';
import { shuffledDeck } from './random.js';

export function newSeat(rng) {
  return {
    life: CONFIG.startLife,
    favor: 0,
    ward: 0,
    planeCap: CONFIG.startPlaneCap,
    plane: CONFIG.startPlaneCap,
    hand: [],
    deck: shuffledDeck(rng),
    discard: [],
    hexTax: 0, // extra cost imposed on the foe's next card
  };
}

export function newDuel(seed) {
  const duel = {
    seed,
    rngState: seed >>> 0,
    turn: 'player',
    turnNumber: 1,
    player: null,
    foe: null,
    aegisThisTurn: { player: 0, foe: 0 },
    cardsThisTurn: { player: 0, foe: 0 },
    lastPlayed: { player: null, foe: null },
    log: [],
    outcome: null, // 'win' | 'loss' | null
  };
  duel.player = newSeatFrom(duel);
  duel.foe = newSeatFrom(duel);
  return duel;
}

function newSeatFrom(duel) {
  return {
    life: CONFIG.startLife,
    favor: 0,
    ward: 0,
    planeCap: CONFIG.startPlaneCap,
    plane: CONFIG.startPlaneCap,
    hand: [],
    deck: shuffledDeck(() => rngFloat(duel)),
    discard: [],
    hexTax: 0, // extra cost imposed on the foe's next card
  };
}

// advance the duel's own rng state; deterministic, clone-safe
export function rngFloat(duel) {
  let a = (duel.rngState + 0x6d2b79f5) | 0;
  duel.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function favorCap(duel, seat) {
  const me = duel[seat];
  const bonus = Math.floor(me.favor / CONFIG.favorPerCapPoint);
  return Math.min(CONFIG.maxPlaneCap, CONFIG.startPlaneCap + bonus);
}

export function canPlay(duel, seat, index) {
  const me = duel[seat];
  const c = CARDS[me.hand[index]];
  if (!c) return false;
  const effective = c.cost + me.hexTax;
  if (effective > me.plane) return false;
  return true;
}

export function effectiveCost(duel, seat, id) {
  return CARDS[id].cost + duel[seat].hexTax;
}

function damage(duel, target, amount) {
  const t = duel[target];
  let left = amount;
  if (t.ward > 0) {
    const soaked = Math.min(t.ward, left);
    t.ward -= soaked;
    left -= soaked;
  }
  t.life -= left;
}

function heal(duel, seat, amount) {
  duel[seat].life = Math.min(CONFIG.startLife, duel[seat].life + amount);
}

function gainFavor(duel, seat, amount) {
  const me = duel[seat];
  me.favor = Math.min(CONFIG.maxFavor, me.favor + amount);
  me.planeCap = favorCap(duel, seat);
}

function draw(duel, seat, n) {
  const me = duel[seat];
  for (let i = 0; i < n; i++) {
    if (me.hand.length >= CONFIG.maxHandSize) return;
    if (me.deck.length === 0) {
      if (me.discard.length === 0) return;
      me.deck = me.discard;
      me.discard = [];
      // reshuffle roughly with the duel rng (deterministic per seed)
      const deck = me.deck;
      for (let k = deck.length - 1; k > 0; k--) {
        const j = Math.floor(rngFloat(duel) * (k + 1));
        [deck[k], deck[j]] = [deck[j], deck[k]];
      }
    }
    me.hand.push(me.deck.pop());
  }
}

function foeOf(seat) {
  return seat === 'player' ? 'foe' : 'player';
}

// The heart: apply one card's effect. Returns the resolved card id.
export function playCard(duel, seat, index, opts) {
  const me = duel[seat];
  const id = me.hand[index];
  const c = CARDS[id];
  if (!c || !canPlay(duel, seat, index)) return null;
  const foe = foeOf(seat);
  const cost = c.cost + me.hexTax;
  me.plane -= cost;
  me.hexTax = 0;
  me.hand.splice(index, 1);
  duel.cardsThisTurn[seat] += 1;
  duel.lastPlayed[seat] = id;

  const halfFavor = Math.floor(me.favor / 2);

  switch (id) {
    case 'slash':
      damage(duel, foe, 2 + halfFavor);
      break;
    case 'crosscut': {
      const bonus = duel.aegisThisTurn[seat] > 0 ? 2 : 0;
      damage(duel, foe, 3 + bonus);
      break;
    }
    case 'duelist_pride':
      damage(duel, foe, 3 * Math.max(1, duel.aegisThisTurn[seat]));
      break;
    case 'blood_pact':
      me.life -= 3;
      damage(duel, foe, 7);
      break;
    case 'meteor':
      damage(duel, foe, 9);
      break;
    case 'scribe':
      draw(duel, seat, 2);
      break;
    case 'tailwind':
      me.plane += 2;
      draw(duel, seat, 1);
      break;
    case 'moon_letter':
      if (me.hand.length === 0) draw(duel, seat, 5);
      else draw(duel, seat, 1);
      break;
    case 'carousel':
      draw(duel, seat, Math.max(1, Math.ceil(me.deck.length / 6)));
      break;
    case 'echo': {
      // replay the previous non-echo card of this turn for free
      const prior = duel.cardsThisTurn[seat] > 1 ? findPrior(duel, seat) : null;
      if (prior) applyEffect(duel, seat, prior);
      break;
    }
    case 'swiftriver':
      damage(duel, foe, 2);
      draw(duel, seat, 2);
      duel[foe].plane = Math.max(0, duel[foe].plane - 1);
      break;
    case 'gilded_coin':
      gainFavor(duel, seat, 2);
      break;
    case 'silk_banner':
      gainFavor(duel, seat, duel.cardsThisTurn[seat]);
      break;
    case 'courtly_favor':
      gainFavor(duel, seat, 3);
      heal(duel, seat, 2);
      break;
    case 'midas_ledger':
      gainFavor(duel, seat, me.plane);
      me.plane = me.planeCap;
      break;
    case 'pearl_dowry':
      gainFavor(duel, seat, 4);
      me.ward += 2;
      break;
    case 'ward_charm':
      me.ward += 2 + halfFavor;
      break;
    case 'ember_veil': {
      const hit = me.ward;
      if (hit > 0) damage(duel, foe, hit);
      me.ward = Math.floor(me.ward / 2);
      break;
    }
    case 'hearthfire':
      heal(duel, seat, 6);
      break;
    case 'everflame':
      me.ward += 4;
      if (me.favor >= 8) damage(duel, foe, 3);
      break;
    case 'hex':
      duel[foe].hexTax += 2;
      break;
    case 'pickpocket': {
      const stolen = Math.min(2, duel[foe].favor);
      duel[foe].favor -= stolen;
      gainFavor(duel, seat, stolen);
      if (duel[foe].hand.length > 0) {
        const j = Math.floor(rngFloat(duel) * duel[foe].hand.length);
        duel[foe].discard.push(duel[foe].hand.splice(j, 1)[0]);
      }
      break;
    }
    case 'jettison': {
      const n = me.hand.length;
      me.discard.push(...me.hand.splice(0));
      draw(duel, seat, Math.max(0, n - 1));
      break;
    }
    case 'mask_of_mirrors': {
      const mirror = duel.lastPlayed[foe];
      if (mirror && CARDS[mirror]) applyEffect(duel, seat, mirror);
      break;
    }
    default:
      break;
  }

  if (c.suit === 'aegis') duel.aegisThisTurn[seat] += 1;

  duel.log.push({
    seat,
    id,
    text: seat === 'player' ? `You played ${c.name}` : `Hexen played ${c.name}`,
  });
  if (duel.log.length > 8) duel.log.shift();

  duel[seat].discard.push(id);
  checkOutcome(duel);
  return id;
}

function findPrior(duel, seat) {
  // last card the seat played this turn, ignoring echo itself
  for (let i = duel.log.length - 1; i >= 0; i--) {
    const e = duel.log[i];
    if (e.seat === seat && e.id !== 'echo') return e.id;
  }
  return null;
}

// apply an effect without paying or discarding (echo / mirror copies)
function applyEffect(duel, seat, id) {
  const foe = foeOf(seat);
  const me = duel[seat];
  const halfFavor = Math.floor(me.favor / 2);
  switch (id) {
    case 'slash': damage(duel, foe, 2 + halfFavor); break;
    case 'crosscut': damage(duel, foe, 3 + (duel.aegisThisTurn[seat] > 0 ? 2 : 0)); break;
    case 'duelist_pride': damage(duel, foe, 3 * Math.max(1, duel.aegisThisTurn[seat])); break;
    case 'blood_pact': me.life -= 3; damage(duel, foe, 7); break;
    case 'meteor': damage(duel, foe, 9); break;
    case 'scribe': draw(duel, seat, 2); break;
    case 'tailwind': me.plane += 2; draw(duel, seat, 1); break;
    case 'moon_letter': draw(duel, seat, me.hand.length === 0 ? 5 : 1); break;
    case 'carousel': draw(duel, seat, Math.max(1, Math.ceil(me.deck.length / 6))); break;
    case 'swiftriver': damage(duel, foe, 2); draw(duel, seat, 2); duel[foe].plane = Math.max(0, duel[foe].plane - 1); break;
    case 'gilded_coin': gainFavor(duel, seat, 2); break;
    case 'silk_banner': gainFavor(duel, seat, duel.cardsThisTurn[seat]); break;
    case 'courtly_favor': gainFavor(duel, seat, 3); heal(duel, seat, 2); break;
    case 'midas_ledger': gainFavor(duel, seat, me.plane); me.plane = me.planeCap; break;
    case 'pearl_dowry': gainFavor(duel, seat, 4); me.ward += 2; break;
    case 'ward_charm': me.ward += 2 + halfFavor; break;
    case 'ember_veil': if (me.ward > 0) damage(duel, foe, me.ward); me.ward = Math.floor(me.ward / 2); break;
    case 'hearthfire': heal(duel, seat, 6); break;
    case 'everflame': me.ward += 4; if (me.favor >= 8) damage(duel, foe, 3); break;
    case 'hex': duel[foe].hexTax += 2; break;
    case 'pickpocket': {
      const stolen = Math.min(2, duel[foe].favor);
      duel[foe].favor -= stolen;
      gainFavor(duel, seat, stolen);
      break;
    }
    case 'jettison': {
      const n = me.hand.length;
      me.discard.push(...me.hand.splice(0));
      draw(duel, seat, Math.max(0, n - 1));
      break;
    }
    case 'echo': break;
    case 'mask_of_mirrors': {
      const mirror = duel.lastPlayed[foe];
      if (mirror && CARDS[mirror]) applyEffect(duel, seat, mirror);
      break;
    }
    default: break;
  }
}

export function endTurn(duel) {
  const seat = duel.turn;
  const me = duel[seat];
  me.ward = Math.floor(me.ward / CONFIG.wardDecayDivisor);
  duel.aegisThisTurn[seat] = 0;
  duel.cardsThisTurn[seat] = 0;
  duel.lastPlayed[seat] = null;
  const foe = foeOf(seat);
  const next = duel[foe];
  next.planeCap = favorCap(duel, foe);
  next.plane = next.planeCap;
  draw(duel, foe, 1);
  duel.turn = foe;
  if (foe === 'player') duel.turnNumber += 1;
  checkOutcome(duel);
}

export function setupHands(duel) {
  draw(duel, 'player', CONFIG.startHand);
  draw(duel, 'foe', CONFIG.startHand);
}

function checkOutcome(duel) {
  const p = duel.player.life;
  const f = duel.foe.life;
  if (p <= 0 && f <= 0) duel.outcome = 'loss';
  else if (f <= 0) duel.outcome = 'win';
  else if (p <= 0) duel.outcome = 'loss';
}

// value snapshot used by the AI's simulation scoring
export function evaluate(duel, seat) {
  const me = duel[seat];
  const foe = duel[foeOf(seat)];
  return (
    me.life * 1.0 +
    me.ward * 0.6 +
    me.favor * 0.8 +
    me.plane * 0.3 +
    me.hand.length * 0.7 +
    me.deck.length * 0.05 -
    foe.life * 1.1 -
    foe.ward * 0.6 -
    foe.favor * 0.6 -
    foe.hand.length * 0.3
  );
}
