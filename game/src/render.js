// render.js — the canvas painter: vector cards, panels, meters and the four
// screens (title, duel table, victory, defeat). Reads state, draws it; no
// game logic. Authored fresh for the best-card-game competition entry.

import { CONFIG } from './config.js';
import { CARDS, SUITS } from './cards.js';
import { effectiveCost } from './engine.js';

const C = CONFIG;
const L = C.layout;

export function drawFrame(ctx, state) {
  const { screen, duel, selection, hover, mouse, paused, buttons } = state;
  ctx.fillStyle = C.colours.bg;
  ctx.fillRect(0, 0, C.canvas.width, C.canvas.height);
  if (screen === 'title') drawTitle(ctx, state);
  else if (screen === 'win') drawEndScreen(ctx, 'VICTORY', 'The Hexen bows and the duel is yours.', C.colours.good);
  else if (screen === 'loss') drawEndScreen(ctx, 'DEFEAT', 'The Hexen claims the night. Try again.', C.colours.bad);
  else drawTable(ctx, duel, selection, hover, mouse, paused, buttons);
}

function suitColour(suit) {
  return C.colours[SUITS[suit].colour];
}

function drawTable(ctx, duel, selection, hover, mouse, paused, buttons) {
  // table floor
  ctx.fillStyle = C.colours.table;
  ctx.fillRect(0, 0, C.canvas.width, C.canvas.height);
  ctx.strokeStyle = C.colours.tableLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 360);
  ctx.lineTo(C.canvas.width - 40, 360);
  ctx.stroke();

  drawSeatPanel(ctx, duel.player, 'YOU', 40, 380);
  drawSeatPanel(ctx, duel.foe, 'HEXEN', 40, 78);
  drawLog(ctx, duel);
  drawTurnBanner(ctx, duel, paused);

  // opponent hand: face-down row of backs
  const foeHand = duel.foe.hand;
  for (let i = 0; i < foeHand.length; i++) {
    const x = 220 + i * (L.foeCardW + 6);
    ctx.fillStyle = '#241c2e';
    ctx.strokeStyle = '#4a3a5e';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, L.foeHandY, L.foeCardW, L.foeCardH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9d86b8';
    ctx.font = C.fonts.cardGlyph;
    ctx.fillText('🎭', x + 34, L.foeHandY + 38);
    ctx.fillStyle = C.colours.dim;
    ctx.font = C.fonts.panelLabel;
    ctx.fillText(`${foeHand[i] ? CARDS[foeHand[i]].cost : ''}p`, x + 66, L.foeHandY + 40);
  }

  // player hand
  const hand = duel.player.hand;
  for (let i = 0; i < hand.length; i++) {
    const x = handX(i, hand.length);
    const selected = i === selection;
    const affordable = duel.player.plane >= effectiveCost(duel, 'player', hand[i]);
    const hovered = mouse && mouse.x >= x && mouse.x <= x + L.cardW && mouse.y >= L.handY && mouse.y <= L.handY + L.cardH;
    drawCard(ctx, hand[i], x, L.handY + (hovered && !selected ? -10 : 0), selected, affordable);
    ctx.fillStyle = C.colours.dim;
    ctx.font = '10px monospace';
    ctx.fillText(String(i + 1), x + L.cardW / 2 - 3, L.handY + L.cardH + 12);
  }

  // buttons (end turn, pause) drawn from the shared registry
  for (const b of buttons) drawButton(ctx, b);
}

export function handX(i, n) {
  const total = n * (L.cardW + L.handGap) - L.handGap;
  const start = (C.canvas.width - total) / 2;
  return start + i * (L.cardW + L.handGap);
}

function drawCard(ctx, id, x, y, selected, affordable) {
  const c = CARDS[id];
  if (!c) return;
  const suit = suitColour(c.suit);
  ctx.save();
  ctx.globalAlpha = affordable ? 1 : 0.55;
  ctx.fillStyle = '#181410';
  ctx.strokeStyle = selected ? C.colours.selected : suit;
  ctx.lineWidth = selected ? 3 : 1.5;
  roundRect(ctx, x, y, L.cardW, L.cardH, 8);
  ctx.fill();
  ctx.stroke();

  // suit stripe + glyph
  ctx.fillStyle = suit;
  ctx.fillRect(x + 8, y + 8, L.cardW - 16, 30);
  ctx.font = C.fonts.cardGlyph;
  ctx.fillStyle = '#f4ead2';
  ctx.fillText(SUITS[c.suit].glyph, x + 14, y + 32);

  // cost pip
  ctx.fillStyle = C.colours.plane;
  ctx.beginPath();
  ctx.arc(x + L.cardW - 18, y + 22, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0e1218';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(String(c.cost), x + L.cardW - 22, y + 26);

  // name + rules text, wrapped
  ctx.fillStyle = C.colours.text;
  ctx.font = C.fonts.cardName;
  wrapText(ctx, c.name, x + 8, y + 58, L.cardW - 16, 13);
  ctx.fillStyle = C.colours.dim;
  ctx.font = C.fonts.cardText;
  wrapText(ctx, c.text, x + 8, y + 88, L.cardW - 16, 11);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawSeatPanel(ctx, seat, label, x, y) {
  ctx.fillStyle = C.colours.panel;
  ctx.strokeStyle = C.colours.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, 160, 92, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.colours.dim;
  ctx.font = C.fonts.panelLabel;
  ctx.fillText(label, x + 12, y + 18);

  ctx.fillStyle = C.colours.hp;
  ctx.font = C.fonts.panelValue;
  ctx.fillText(`♥ ${Math.max(0, seat.life)}`, x + 12, y + 42);
  // life bar
  const pct = Math.max(0, seat.life) / C.startLife;
  ctx.fillStyle = '#3a1f1a';
  ctx.fillRect(x + 12, y + 48, 136, 7);
  ctx.fillStyle = pct < 0.25 ? C.colours.hpLow : C.colours.hp;
  ctx.fillRect(x + 12, y + 48, 136 * pct, 7);

  ctx.fillStyle = C.colours.plane;
  ctx.fillText(`◈ ${seat.plane}/${seat.planeCap}`, x + 12, y + 70);
  ctx.fillStyle = C.colours.favor;
  ctx.fillText(`✦ ${seat.favor}`, x + 84, y + 70);
  ctx.fillStyle = C.colours.ward;
  ctx.font = C.fonts.panelLabel;
  ctx.fillText(`ward ${seat.ward}`, x + 12, y + 86);
}

function drawLog(ctx, duel) {
  ctx.fillStyle = C.colours.panel;
  roundRect(ctx, 220, 396, 360, 96, 6);
  ctx.fill();
  ctx.strokeStyle = C.colours.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = C.fonts.log;
  const entries = duel.log.slice(-5);
  entries.forEach((e, i) => {
    ctx.fillStyle = e.seat === 'player' ? C.colours.good : '#b07ac9';
    ctx.fillText(e.text, 232, 414 + i * 16);
  });
}

function drawTurnBanner(ctx, duel, paused) {
  ctx.fillStyle = duel.turn === 'player' ? C.colours.good : '#b07ac9';
  ctx.font = C.fonts.panelValue;
  const text = paused ? 'PAUSED (P)' : duel.turn === 'player' ? `YOUR TURN — plane ${duel.player.plane}/${duel.player.planeCap}` : 'HEXEN THINKS…';
  ctx.fillText(text, 620, 120);
  ctx.fillStyle = C.colours.dim;
  ctx.font = C.fonts.panelLabel;
  ctx.fillText(`Turn ${duel.turnNumber}`, 620, 140);
}

function drawButton(ctx, b) {
  const hovered = b.hover;
  ctx.fillStyle = hovered ? C.colours.buttonHover : C.colours.button;
  ctx.strokeStyle = C.colours.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, b.x, b.y, b.w, b.h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.colours.text;
  ctx.font = C.fonts.panelLabel;
  ctx.fillText(b.label, b.x + 12, b.y + b.h / 2 + 4);
}

function drawTitle(ctx, state) {
  ctx.fillStyle = C.colours.bg;
  ctx.fillRect(0, 0, C.canvas.width, C.canvas.height);
  // decorative suit sigils
  const glyphs = ['⚔', '🪁', '✿', '🔥', '🎭'];
  glyphs.forEach((g, i) => {
    ctx.font = '44px Georgia, serif';
    ctx.globalAlpha = 0.25;
    ctx.fillText(g, 340 + i * 130, 220);
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.colours.text;
  ctx.font = C.fonts.title;
  ctx.textAlign = 'center';
  ctx.fillText('HEXEN DUEL', C.canvas.width / 2, 330);
  ctx.font = C.fonts.subtitle;
  ctx.fillStyle = C.colours.dim;
  ctx.fillText('A card duel of plane, favor and ruses. 30 life each — the Hexen awaits.', C.canvas.width / 2, 372);
  ctx.font = C.fonts.panelLabel;
  ctx.fillText('Click a card twice to play it, or press 1–9. E ends the turn. P pauses.', C.canvas.width / 2, 404);
  for (const b of state.buttons) drawButton(ctx, b);
  ctx.textAlign = 'left';
}

function drawEndScreen(ctx, headline, sub, colour) {
  ctx.fillStyle = C.colours.bg;
  ctx.fillRect(0, 0, C.canvas.width, C.canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = colour;
  ctx.font = C.fonts.title;
  ctx.fillText(headline, C.canvas.width / 2, 320);
  ctx.fillStyle = C.colours.dim;
  ctx.font = C.fonts.subtitle;
  ctx.fillText(sub, C.canvas.width / 2, 368);
  ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
