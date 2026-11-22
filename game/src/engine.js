// The duel itself, with no rendering and no input: a turn-based rules engine the renderer
// paints and the AI plays by simulation. One turn at a time, alternating player and foe.
//
// The plane: each turn refills to its owner's plane max (3, +1 per two favor at turn start),
// cards cost plane and unspent plane carries within the turn only.
// Ward: absorbs damage before life and vanishes at the end of its own turn.
// Favor: a counter that scales card effects; every 2 favor raises the plane cap by 1 (to 6).
//
// The pending-effect queue makes compound cards work: playing Echo pushes a replay of the last
// card onto the queue; the AI resolves the same queue in simulation, so its forecast is exact.

import { CARDS } from './cards.js';
import { startingDeck } from './random.js';

export const EVENT_LOG = 1;
export const EVENT_OVER = 2;

const PLANE_BASE = 3;
const PLANE_MAX_CAP = 6;
const FAVOR_PER_PLANE = 2;
const HAND_SIZE = 5;
const LIFE_MAX = 30;
const WARD_DECAY = 0.5; // half of remaining ward rounds down at the end of the turn

function freshSide(name) {
  return {
    name,
    life: LIFE_MAX,
    ward: 0,
    favor: 0,
    draw: [],
    hand: [],
    discard: [],
    playedThisTurn: [],
    lastCardPlayed: null,
    hexCost: 0, // cost added to this side's next card
  };
}

export function createDuel(random) {
  const duel = {
    random,
    player: freshSide('You'),
    foe: freshSide('The Hexen'),
    turn: 'player',
    turnNumber: 1,
    plane: PLANE_BASE,
    planeMax: PLANE_BASE,
    log: [],
    over: false,
    winner: null,
    turnCount: 0,
  };
  duel.player.draw = startingDeck(random);
  duel.foe.draw = startingDeck(random);
  for (let i = 0; i < HAND_SIZE; i += 1) {
    drawCard(duel, 'player');
    drawCard(duel, 'foe');
  }
  return duel;
}

function other(who) {
  return who === 'player' ? 'foe' : 'player';
}

export function drawCard(duel, who) {
  const side = duel[who];
  if (side.draw.length === 0) {
    if (side.discard.length === 0) return false;
    side.draw = side.discard;
    side.discard = [];
    for (let i = side.draw.length - 1; i > 0; i -= 1) {
      const j = Math.floor(duel.random() * (i + 1));
      [side.draw[i], side.draw[j]] = [side.draw[j], side.draw[i]];
    }
  }
  if (side.hand.length >= 10) return false;
  side.hand.push(side.draw.pop());
  return true;
}

export function planeMaxOf(duel) {
  return Math.min(PLANE_MAX_CAP, PLANE_BASE + Math.floor(duel[duel.turn].favor / FAVOR_PER_PLANE));
}

/** Start the next turn: refill plane, decay ward, hexes clear at the owner's turn start. */
export function beginTurn(duel) {
  const who = duel.turn;
  const side = duel[who];
  side.hexCost = 0;
  duel.planeMax = planeMaxOf(duel);
  duel.plane = duel.planeMax;
  side.playedThisTurn = [];
  duel.turnCount += 1;
  // Ward fades at the start of the ward-owner's next turn: it protected the intervening attacks.
  side.ward = Math.floor(side.ward * WARD_DECAY);
  for (let i = 0; i < 1; i += 1) drawCard(duel, who);
  pushLog(duel, `${side.name}: turn ${duel.turnCount}, plane ${duel.plane}/${duel.planeMax}`);
}

function pushLog(duel, text) {
  duel.log.push(text);
  if (duel.log.length > 60) duel.log.shift();
}

/** Play the card at hand index `index` for the side whose turn it is. Returns the events fired. */
export function playCard(duel, index) {
  const who = duel.turn;
  const side = duel[who];
  const id = side.hand[index];
  if (id === undefined) return 0;
  const card = CARDS[id];
  const cost = cardCost(duel, id);
  if (cost > duel.plane) return 0;
  if (id === 'meteor' && side.playedThisTurn.some((c) => CARDS[c].suit === 'lantern')) {
    // Meteor's own rule, checked here rather than inside resolve so the cost preview matches.
    if (duel.plane < cost + 2) return 0;
  }
  side.hand.splice(index, 1);
  side.discard.push(id);
  side.lastCardPlayed = id;
  side.playedThisTurn.push(id);
  duel.plane -= cost;
  side.hexCost = 0; // a hex taxes the next card only
  const events = resolveCard(duel, who, id);
  checkOver(duel);
  return events;
}

/** The cost the side would pay right now, hexes and Meteor's rider included. */
export function cardCost(duel, id) {
  const card = CARDS[id];
  const side = duel[duel.turn];
  let cost = card.cost + side.hexCost;
  if (id === 'meteor' && side.playedThisTurn.some((c) => CARDS[c].suit === 'lantern')) cost += 2;
  return cost;
}

function dealDamage(duel, target, amount) {
  const side = duel[target];
  let left = amount;
  if (side.ward > 0) {
    const absorbed = Math.min(side.ward, left);
    side.ward -= absorbed;
    left -= absorbed;
  }
  side.life -= left;
  pushLog(duel, `${side.name} takes ${amount} damage${amount - left > 0 ? ` (${amount - left} warded)` : ''}`);
}

function heal(duel, who, amount) {
  const side = duel[who];
  const before = side.life;
  side.life = Math.min(LIFE_MAX, side.life + amount);
  if (side.life > before) pushLog(duel, `${side.name} heals ${side.life - before} life`);
}

/** Resolve one card's whole effect, including the compound ones. Returns EVENT_* flags. */
export function resolveCard(duel, who, id) {
  const side = duel[who];
  const foe = duel[other(who)];
  const foeWho = other(who);
  const card = CARDS[id];
  const suit = card.suit;
  let events = EVENT_LOG;
  const aegisCount = side.playedThisTurn.filter((c) => CARDS[c].suit === 'aegis').length;

  switch (id) {
    case 'slash':
      dealDamage(duel, foeWho, 4 + Math.floor(side.favor / 8));
      break;
    case 'crosscut': {
      let dmg = 3;
      const before = side.playedThisTurn.length;
      dealDamage(duel, foeWho, dmg);
      if (before >= 2 && CARDS[side.playedThisTurn[before - 2]].suit === 'aegis') {
        dealDamage(duel, foeWho, 3);
        pushLog(duel, 'Crosscut chains for 3 more!');
      }
      break;
    }
    case 'meteor':
      dealDamage(duel, foeWho, 9 + Math.floor(side.favor / 6));
      break;
    case 'bloodpact':
      side.life -= 3;
      dealDamage(duel, foeWho, 7);
      pushLog(duel, `${side.name} pays 3 life to the pact`);
      break;
    case 'duel':
      dealDamage(duel, foeWho, 3 + 3 * aegisCount);
      pushLog(duel, `Duelist\u2019s Pride: ${aegisCount} Aegis played, ${3 + 3 * aegisCount} damage`);
      break;
    case 'scribe':
      drawCard(duel, who); drawCard(duel, who);
      pushLog(duel, `${side.name} draws 2`);
      break;
    case 'tailwind':
      duel.plane += 2;
      drawCard(duel, who);
      pushLog(duel, `${side.name} rides the wind: +2 plane`);
      break;
    case 'moonletter': {
      drawCard(duel, who);
      if (side.hand.length === 0) { drawCard(duel, who); drawCard(duel, who); pushLog(duel, 'The Moon Letter returns twice!'); }
      break;
    }
    case 'carousel': {
      const n = Math.max(1, Math.floor(side.draw.length / 5));
      for (let i = 0; i < n; i += 1) drawCard(duel, who);
      pushLog(duel, `Carousel turns: ${n} card${n === 1 ? '' : 's'}`);
      break;
    }
    case 'echo': {
      const last = side.playedThisTurn.filter((c) => c !== 'echo' && CARDS[c].suit !== 'mask').pop();
      if (last) {
        pushLog(duel, `Echo replays ${CARDS[last].name}`);
        events |= resolveCard(duel, who, last);
      } else {
        dealDamage(duel, foeWho, 2);
        pushLog(duel, 'Echo has nothing to repeat: 2 damage');
      }
      break;
    }
    case 'coin':
      side.favor += 3;
      pushLog(duel, `${side.name} gains 3 favor`);
      break;
    case 'silk': {
      const gain = 2 * side.playedThisTurn.length - 2; // cards played before this one
      side.favor += Math.max(0, gain) + 1;
      pushLog(duel, `Silk Banner: +${Math.max(0, gain) + 1} favor`);
      break;
    }
    case 'favor':
      side.favor += 6;
      heal(duel, who, 2);
      break;
    case 'midas': {
      const gain = duel.plane;
      side.favor += gain;
      duel.plane = duel.planeMax;
      pushLog(duel, `Midas Ledger: +${gain} favor, plane refilled`);
      break;
    }
    case 'ward':
      side.ward += 5 + side.favor;
      pushLog(duel, `${side.name} raises ${5 + side.favor} ward`);
      break;
    case 'bulwark':
      side.ward += 8;
      heal(duel, who, 2);
      break;
    case 'emberveil': {
      side.ward += 3;
      const burst = Math.floor(side.ward / 5) * 2;
      if (burst > 0) dealDamage(duel, foeWho, burst);
      pushLog(duel, `Ember Veil: ${burst} burning damage`);
      break;
    }
    case 'hearth':
      heal(duel, who, 6);
      side.favor += 1;
      break;
    case 'pickpocket': {
      const stolen = Math.min(3, foe.favor);
      foe.favor -= stolen;
      side.favor += stolen;
      if (foe.hand.length > 0) {
        const i = Math.floor(duel.random() * foe.hand.length);
        const [stolenCard] = foe.hand.splice(i, 1);
        foe.discard.push(stolenCard);
        pushLog(duel, `Pickpocket: ${stolen} favor, ${CARDS[stolenCard].name} discarded`);
      }
      break;
    }
    case 'jettison': {
      // The chooser picks from the UI; the engine discards the cheapest (or all, via chooseDiscard).
      const count = Math.min(3, side.hand.length);
      for (let i = 0; i < count; i += 1) {
        const c = side.hand.pop();
        side.discard.push(c);
        drawCard(duel, who);
      }
      drawCard(duel, who);
      pushLog(duel, `Jettison: ${count} cards traded for ${count + 1}`);
      break;
    }
    case 'hex':
      foe.hexCost += 2;
      pushLog(duel, `${foe.name}\u2019s next card costs 2 more`);
      break;
    case 'mirror': {
      const last = side.playedThisTurn.filter((c) => c !== 'mirror').pop();
      if (last) {
        pushLog(duel, `Mask of Mirrors copies ${CARDS[last].name}`);
        events |= resolveCard(duel, who, last);
      } else {
        pushLog(duel, 'The mask reflects nothing');
      }
      break;
    }
    default:
      break;
  }
  return events;
}

function checkOver(duel) {
  if (duel.over) return;
  if (duel.player.life <= 0 || duel.foe.life <= 0) {
    duel.over = true;
    // Both dead the same resolution: the attacker (whose turn it is) takes it.
    if (duel.foe.life <= 0 && duel.player.life > 0) duel.winner = 'player';
    else if (duel.player.life <= 0 && duel.foe.life > 0) duel.winner = 'foe';
    else duel.winner = duel.turn;
  }
}

/** End the current side's turn: ward decays, then the other side begins. */
export function endTurn(duel) {
  const who = duel.turn;
  duel[who].ward = Math.floor(duel[who].ward * WARD_DECAY);
  duel.turn = other(who);
  beginTurn(duel);
}
