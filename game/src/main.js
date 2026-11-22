// Boot, the input loop and the screen flow. The duel is turn-based, so there is no fixed-step
// simulation: every animation frame reads input, applies it to the duel (the player's moves at
// once; the Hexen's after a short thinking beat so its turn reads as an event), and repaints.
//
// ?seed=N fixes the duel. ?shot=start|play|win|loss (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { RECORD_KEY, TABLE } from './config.js';
import { createDuel, beginTurn, endTurn, playCard } from './engine.js';
import { takeMove } from './ai.js';
import {
  ACTION_CONFIRM, ACTION_DIGIT, ACTION_DOWN, ACTION_END_TURN, ACTION_LEFT, ACTION_PAUSE,
  ACTION_RIGHT, ACTION_UP, createInput,
} from './input.js';
import { createRenderer, SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function readRecord() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECORD_KEY) ?? '{}');
    return { wins: raw.wins | 0, losses: raw.losses | 0 };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

function saveRecord(record) {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Storage can be off (private windows): the record then lasts this visit only.
  }
}

function announce(message) {
  status.textContent = message;
}

// ---- The game shell -------------------------------------------------------

const record = readRecord();
let screen = SCREEN_TITLE;
let duel = null;
let selected = 0;
let hitTargets = [];
let hexenDelay = 0; // seconds left before the Hexen's next move resolves

function newDuel() {
  duel = createDuel(Math.floor(Math.random() * 4294967296));
  beginTurn(duel);
  selected = 0;
  hexenDelay = 0;
  screen = SCREEN_PLAY;
  announce('The duel begins. Your turn.');
}

function play(index) {
  if (duel.over || duel.turn !== 'player') return;
  const events = playCard(duel, index);
  if (events === 0) return;
  selected = Math.min(selected, Math.max(0, duel.player.hand.length - 1));
  if (duel.over) finish();
}

function finish() {
  if (duel.winner === 'player') {
    screen = SCREEN_WIN;
    record.wins += 1;
    announce(`Victory. The Hexen falls. Record ${record.wins} won, ${record.losses} lost.`);
  } else {
    screen = SCREEN_LOSS;
    record.losses += 1;
    announce(`Defeat. The Hexen prevails. Record ${record.wins} won, ${record.losses} lost.`);
  }
  saveRecord(record);
}

function clickAt(clientX, clientY, canvasRect) {
  const point = renderer.toTable(clientX, clientY, canvasRect);
  for (const target of hitTargets) {
    if (point.x >= target.x && point.x <= target.x + target.w && point.y >= target.y && point.y <= target.y + target.h) {
      if (target.kind === 'card') {
        if (selected === target.index) play(target.index);
        else selected = target.index;
      } else if (target.kind === 'endTurn') {
        if (duel.turn === 'player' && !duel.over) {
          endTurn(duel);
          hexenDelay = 0.55;
          announce('You end your turn.');
        }
      }
      return;
    }
  }
  if (screen !== SCREEN_PLAY) hexenDelay = 0; // any click confirms on the shell screens
}

canvas.addEventListener('pointerdown', (event) => {
  clickAt(event.clientX, event.clientY, canvas.getBoundingClientRect());
});

function handleActions(actions) {
  if (actions & ACTION_CONFIRM) {
    if (screen === SCREEN_TITLE) newDuel();
    else if (screen === SCREEN_WIN || screen === SCREEN_LOSS) screen = SCREEN_TITLE;
  }
  if (screen !== SCREEN_PLAY || duel === null) return;
  if (actions & ACTION_END_TURN && duel.turn === 'player' && !duel.over) {
    endTurn(duel);
    hexenDelay = 0.55;
    announce('You end your turn.');
  }
  if (actions & ACTION_LEFT) selected = Math.max(0, selected - 1);
  if (actions & ACTION_RIGHT) selected = Math.min(duel.player.hand.length - 1, selected + 1);
  if (actions & ACTION_UP) selected = Math.max(0, selected - 1);
  if (actions & ACTION_DOWN) selected = Math.min(duel.player.hand.length - 1, selected + 1);
  if (actions & ACTION_DIGIT) {
    const digit = actions & 0x1f;
    const index = digit === 10 ? 9 : digit - 1;
    if (index < duel.player.hand.length) play(index);
  }
}

function frame(now, input) {
  const dt = Math.min(0.1, (now - frame.last) / 1000);
  frame.last = now;

  const actions = input.takeActions();
  if (actions) handleActions(actions);

  // The Hexen's moves arrive on a short delay so its turn reads as a sequence, not a flash.
  if (screen === SCREEN_PLAY && duel.turn === 'foe' && !duel.over) {
    hexenDelay -= dt;
    if (hexenDelay <= 0) {
      takeMove(duel);
      if (duel.over) finish();
      else { hexenDelay = 0.55; announce(duel.turn === 'player' ? 'The Hexen ends its turn. Your turn.' : 'The Hexen plays\u2026'); }
    }
  }

  hitTargets = renderer.paint(duel, screen, { selected }, record);
  requestAnimationFrame((t) => frame(t, input));
}

// ---- Screenshot staging ---------------------------------------------------

function runShot(name) {
  const scene = stageShot(name, seed);
  duel = scene.duel;
  screen = scene.screen;
  let frames = 0;
  function paint() {
    renderer.paint(duel, screen, { selected: 0 }, record);
    frames += 1;
    if (frames < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) {
  runShot(shot);
} else {
  const input = createInput(canvas);
  announce('Hexen Duel. Press space to begin.');
  frame.last = performance.now();
  requestAnimationFrame((t) => frame(t, input));
}
