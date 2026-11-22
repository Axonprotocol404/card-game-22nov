// main.js — boot, the frame loop and the screen flow of Hexen Duel.
// Title -> duel -> win/loss -> title, driven by one-shot input actions.
// Authored fresh for the best-card-game competition entry.

import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { drawFrame, handX } from './render.js';
import { newDuel, setupHands, playCard, endTurn, canPlay, effectiveCost } from './engine.js';
import { foeTurn } from './ai.js';
import { buildScene } from './shots.js';

const canvas = document.getElementById('table');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot');

const state = {
  screen: 'title',
  duel: null,
  selection: 0,
  mouse: null,
  paused: false,
  buttons: [],
  seed: Number(params.get('seed')) || (Date.now() % 100000),
};

const input = createInput(canvas);

function newGame() {
  state.duel = newDuel(state.seed);
  setupHands(state.duel);
  state.screen = 'duel';
  state.selection = 0;
  state.paused = false;
}

function cardRect(i, n) {
  const x = handX(i, n);
  return { x, y: CONFIG.layout.handY, w: CONFIG.layout.cardW, h: CONFIG.layout.cardH };
}

function inRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function buildButtons() {
  const buttons = [];
  if (state.screen === 'duel') {
    buttons.push({ id: 'end', label: 'END TURN (E)', x: 1000, y: 380, w: 150, h: 36, hover: false });
  }
  if (state.screen === 'title') {
    buttons.push({ id: 'start', label: 'BEGIN THE DUEL', x: 520, y: 460, w: 240, h: 44, hover: false });
  }
  if (state.screen === 'win' || state.screen === 'loss') {
    buttons.push({ id: 'again', label: 'DUEL AGAIN', x: 540, y: 440, w: 200, h: 44, hover: false });
  }
  return buttons;
}

function handleAction(a) {
  const buttons = state.buttons;
  if (a.type === 'click') {
    for (const b of buttons) {
      if (inRect(a, b)) return clickButton(b.id);
    }
    if (state.screen === 'duel' && state.duel.turn === 'player' && !state.paused) {
      const hand = state.duel.player.hand;
      for (let i = 0; i < hand.length; i++) {
        if (inRect(a, cardRect(i, hand.length))) {
          if (state.selection === i) tryPlay(i);
          else state.selection = i;
          return;
        }
      }
    }
    return;
  }
  if (a.type === 'confirm') {
    if (state.screen === 'title') newGame();
    else if (state.screen === 'win' || state.screen === 'loss') state.screen = 'title';
    return;
  }
  if (a.type === 'pause' && state.screen === 'duel') {
    state.paused = !state.paused;
    return;
  }
  if (state.screen !== 'duel' || state.paused || state.duel.turn !== 'player') return;
  if (a.type === 'move') {
    state.selection = Math.max(0, Math.min(state.duel.player.hand.length - 1, state.selection + a.dx));
  } else if (a.type === 'playIndex') {
    tryPlay(a.index);
  } else if (a.type === 'endTurn') {
    endPlayerTurn();
  }
}

function clickButton(id) {
  if (id === 'start') newGame();
  else if (id === 'end') endPlayerTurn();
  else if (id === 'again') state.screen = 'title';
}

function tryPlay(index) {
  const duel = state.duel;
  if (!duel || duel.turn !== 'player' || duel.outcome) return;
  if (!canPlay(duel, 'player', index)) return;
  playCard(duel, 'player', index);
  state.selection = Math.min(state.selection, duel.player.hand.length - 1);
  if (duel.outcome) state.screen = duel.outcome;
}

function endPlayerTurn() {
  const duel = state.duel;
  if (!duel || duel.turn !== 'player' || duel.outcome) return;
  endTurn(duel);
  if (duel.outcome) {
    state.screen = duel.outcome;
    return;
  }
  foeTurn(duel);
  if (duel.outcome) state.screen = duel.outcome;
}

function frame() {
  const { actions, hover } = input.drain();
  for (const a of actions) handleAction(a);
  state.buttons = buildButtons();
  state.mouse = hover;
  for (const b of state.buttons) {
    b.hover = !!hover && hover.x >= b.x && hover.x <= b.x + b.w && hover.y >= b.y && hover.y <= b.y + b.h;
  }
  drawFrame(ctx, state);
  requestAnimationFrame(frame);
}

// ?shot= path: render one deterministic scene and stop the loop.
if (shotMode) {
  const scene = buildScene(shotMode, state.seed);
  if (scene.screen === 'title') {
    state.screen = 'title';
    state.buttons = buildButtons();
    drawFrame(ctx, state);
  } else if (scene.screen === 'win' || scene.screen === 'loss') {
    state.screen = scene.screen;
    drawFrame(ctx, state);
  } else {
    state.duel = scene.duel;
    state.screen = 'duel';
    state.buttons = buildButtons();
    drawFrame(ctx, state);
  }
  // signal the harness that the scene is fully rendered
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}

// focus the canvas so keyboard input lands immediately
canvas.focus();
