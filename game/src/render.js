// The renderer: one canvas, painted from the duel state. Cards are drawn as vector art (rounded
// frames, suit glyphs, cost pips in the corner, wrapped rule text) so nothing is fetched: the
// whole table is code. It owns the 1280x720 logical table scaled to the window, and the layout map
// the mouse clicks against (hit targets for every card and button), rebuilt on each paint.
//
// Screens: title, play, pause, win and loss each have their own painter; the table painter is
// shared by play and by the end screens' dimmed backdrop.

import { CARDS, SUITS } from './cards.js';
import { cardCost } from './engine.js';
import {
  CARD_H, CARD_W, FONT, FONT_DISPLAY, HAND_LIFT, HAND_OVERLAP, LANE, PALETTE, TABLE,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';
export const SCREEN_PAUSE = 'pause';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = attempt;
  }
  if (line) lines.push(line);
  return lines;
}

/** One card, drawn from scratch: frame, suit band, cost pip, name and rules text. */
export function drawCard(ctx, id, x, y, options) {
  const card = CARDS[id];
  const suit = SUITS[card.suit];
  const lifted = options.lifted === true;
  const dim = options.dim === true;
  const w = CARD_W;
  const h = CARD_H;
  ctx.save();
  ctx.translate(x, y + (lifted ? -HAND_LIFT : 0));
  ctx.globalAlpha = dim ? 0.45 : 1;

  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = lifted ? 22 : 10;
  ctx.shadowOffsetY = lifted ? 8 : 4;
  const frame = ctx.createLinearGradient(0, 0, 0, h);
  frame.addColorStop(0, '#2a3148');
  frame.addColorStop(1, '#171c2e');
  ctx.fillStyle = frame;
  roundRect(ctx, 0, 0, w, h, 10);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = lifted ? suit.color : 'rgba(150,165,210,0.5)';
  ctx.lineWidth = lifted ? 3 : 1.6;
  roundRect(ctx, 0, 0, w, h, 10);
  ctx.stroke();

  ctx.fillStyle = suit.dark;
  roundRect(ctx, 4, 4, w - 8, 34, 7);
  ctx.fill();
  ctx.strokeStyle = suit.color;
  ctx.lineWidth = 1;
  roundRect(ctx, 4, 4, w - 8, 34, 7);
  ctx.stroke();

  const cost = options.cost;
  ctx.beginPath();
  ctx.arc(-2, 2, 15, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.plane;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#08131e';
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(cost), -2, 3);

  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = suit.color;
  ctx.fillText(suit.glyph, w - 24, 22);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 13.5px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  const nameLines = wrapText(ctx, card.name, w - 16).slice(0, 2);
  nameLines.forEach((line, i) => ctx.fillText(line, w / 2, 52 + i * 15));

  ctx.font = `11.5px ${FONT}`;
  ctx.fillStyle = '#c7cede';
  const textLines = wrapText(ctx, card.text, w - 18);
  textLines.slice(0, 6).forEach((line, i) => ctx.fillText(line, w / 2, 86 + i * 14));

  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = suit.color;
  ctx.fillText(suit.name.toUpperCase(), w / 2, h - 12);
  ctx.restore();
  return { x, y: y + (lifted ? -HAND_LIFT : 0), w, h };
}

function bar(ctx, x, y, w, h, pct, fill, back) {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  if (pct > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(8, w * Math.min(1, pct)), h, 6);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 6);
  ctx.stroke();
}

function drawSidePanel(ctx, side, x, y, label) {
  const w = 300;
  const h = 128;
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + 16, y + 26);

  const lifePct = Math.max(0, side.life) / 30;
  bar(ctx, x + 16, y + 38, w - 32, 20, lifePct, PALETTE.danger, '#5a1410');
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`LIFE ${Math.max(0, side.life)}/30`, x + 22, y + 53);

  const wardRow = side.ward > 0;
  if (wardRow) {
    bar(ctx, x + 16, y + 64, w - 32, 12, Math.min(1, side.ward / 20), PALETTE.ward, '#2c3550');
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = PALETTE.ward;
    ctx.fillText(`WARD ${side.ward}`, x + 22, y + 74);
  }

  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`\u2726 ${side.favor} favor`, x + 16, y + (wardRow ? 102 : 90));
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Deck ${side.draw.length}  Discard ${side.discard.length}  Hand ${side.hand.length}`, x + 96, y + (wardRow ? 102 : 90));
}

function drawPlaneMeter(ctx, duel) {
  const x = TABLE.width / 2 - 130;
  const y = LANE.centerSplit - 20;
  const w = 260;
  const h = 18;
  ctx.fillStyle = 'rgba(10,14,26,0.85)';
  roundRect(ctx, x, y, w, h, 9);
  ctx.fill();
  const pct = duel.plane / duel.planeMax;
  if (pct > 0) {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#3f8fd4');
    grad.addColorStop(1, PALETTE.plane);
    ctx.fillStyle = grad;
    roundRect(ctx, x + 2, y + 2, Math.max(6, (w - 4) * pct), h - 4, 7);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`PLANE ${duel.plane}/${duel.planeMax}`, x + w / 2, y + 13);
  ctx.textAlign = 'left';
}

function drawTable(ctx, duel) {
  const bg = ctx.createLinearGradient(0, 0, 0, TABLE.height);
  bg.addColorStop(0, PALETTE.backdrop0);
  bg.addColorStop(0.5, PALETTE.backdrop1);
  bg.addColorStop(1, PALETTE.backdrop0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);
  ctx.fillStyle = PALETTE.felt;
  ctx.fillRect(0, LANE.centerSplit, TABLE.width, TABLE.height - LANE.centerSplit);
  ctx.strokeStyle = PALETTE.feltLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, LANE.centerSplit);
  ctx.lineTo(TABLE.width, LANE.centerSplit);
  ctx.stroke();

  drawSidePanel(ctx, duel.player, 20, TABLE.height - 148, 'You');
  drawSidePanel(ctx, duel.foe, TABLE.width - 320, 12, duel.foe.name);
  drawPlaneMeter(ctx, duel);

  ctx.fillStyle = duel.turn === 'player' ? 'rgba(127,212,255,0.14)' : 'rgba(226,86,78,0.14)';
  roundRect(ctx, TABLE.width / 2 - 120, LANE.centerSplit - 58, 240, 30, 8);
  ctx.fill();
  ctx.fillStyle = duel.turn === 'player' ? PALETTE.plane : PALETTE.danger;
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(duel.turn === 'player' ? 'YOUR TURN \u2014 play a card' : 'THE HEXEN IS THINKING\u2026', TABLE.width / 2, LANE.centerSplit - 38);
  ctx.textAlign = 'left';
}

function drawCardBack(ctx, x, y) {
  const w = CARD_W;
  const h = CARD_H;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#3a2a55');
  g.addColorStop(0.5, '#241a3a');
  g.addColorStop(1, '#3a2a55');
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, w, h, 10);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(179,140,255,0.6)';
  ctx.lineWidth = 2;
  roundRect(ctx, 5, 5, w - 10, h - 10, 7);
  ctx.stroke();
  ctx.font = `44px ${FONT}`;
  ctx.fillStyle = 'rgba(179,140,255,0.5)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2739', w / 2, h / 2);
  ctx.restore();
}

function drawFoeZone(ctx, duel) {
  const hand = duel.foe.hand;
  const total = hand.length;
  const step = CARD_W - HAND_OVERLAP;
  const span = Math.max(CARD_W, total * step - HAND_OVERLAP + CARD_W);
  const startX = (TABLE.width - span) / 2;
  for (let i = 0; i < total; i += 1) {
    const x = startX + i * step;
    ctx.save();
    ctx.translate(x + CARD_W / 2, LANE.foeHandY + CARD_H / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-CARD_W / 2, -CARD_H / 2);
    drawCardBack(ctx, 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${total} in hand \u00b7 ${duel.foe.draw.length} in deck \u00b7 ${duel.foe.discard.length} discarded`, TABLE.width / 2, LANE.foeHandY + CARD_H + 20);
  ctx.textAlign = 'left';
}

function drawPlayerHand(ctx, duel, selected, hitTargets) {
  const hand = duel.player.hand;
  const total = hand.length;
  const step = CARD_W - HAND_OVERLAP;
  const span = Math.max(CARD_W, total * step - HAND_OVERLAP + CARD_W);
  const startX = (TABLE.width - span) / 2;
  for (let i = 0; i < total; i += 1) {
    const id = hand[i];
    const selectedNow = i === selected;
    const cost = cardCost(duel, id);
    const affordable = cost <= duel.plane;
    const rect = drawCard(ctx, id, startX + i * step, LANE.handY, { lifted: selectedNow, cost, dim: !affordable });
    if (affordable && !selectedNow) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = SUITS[CARDS[id].suit].color;
      ctx.lineWidth = 2;
      roundRect(ctx, rect.x, rect.y, CARD_W, CARD_H, 10);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(238,241,248,0.75)';
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String((i + 1) % 10), rect.x + 6, rect.y + CARD_H - 8);
    hitTargets.push({ kind: 'card', index: i, x: rect.x, y: rect.y, w: CARD_W, h: CARD_H });
  }
}

function drawEndTurnButton(ctx, duel, hitTargets) {
  const w = 170;
  const h = 40;
  const x = TABLE.width - w - 24;
  const y = TABLE.height - h - 20;
  const active = duel.turn === 'player' && !duel.over;
  ctx.fillStyle = active ? 'rgba(127,212,255,0.9)' : 'rgba(90,100,130,0.5)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = active ? '#08131e' : '#c7cede';
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(active ? 'END TURN (E)' : 'FOE\u2019S TURN\u2026', x + w / 2, y + 25);
  ctx.textAlign = 'left';
  hitTargets.push({ kind: 'endTurn', x, y, w, h });
}

function drawLog(ctx, duel) {
  const x = 24;
  const y = 234;
  const w = 270;
  const h = 130;
  ctx.fillStyle = 'rgba(10,13,24,0.6)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,140,200,0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `11.5px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  const lines = duel.log.slice(-6);
  lines.forEach((line, i) => {
    ctx.globalAlpha = 0.45 + (0.55 * (i + 1)) / lines.length;
    ctx.fillText(line.slice(0, 42), x + 12, y + 22 + i * 17);
  });
  ctx.globalAlpha = 1;
}

function paintTable(ctx, duel, ui, hitTargets) {
  drawTable(ctx, duel);
  drawLog(ctx, duel);
  drawFoeZone(ctx, duel);
  drawPlayerHand(ctx, duel, ui.selected, hitTargets);
  drawEndTurnButton(ctx, duel, hitTargets);
  drawVignette(ctx);
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(TABLE.width / 2, TABLE.height / 2, TABLE.height * 0.45, TABLE.width / 2, TABLE.height / 2, TABLE.height * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, PALETTE.vignette);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);
}

function paintTitle(ctx, record) {
  const bg = ctx.createLinearGradient(0, 0, 0, TABLE.height);
  bg.addColorStop(0, '#0b0d16');
  bg.addColorStop(0.55, '#1a1630');
  bg.addColorStop(1, '#0b0d16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);

  const suitKeys = Object.keys(SUITS);
  suitKeys.forEach((key, i) => {
    const suit = SUITS[key];
    const angle = Math.PI * (0.15 + (0.7 * i) / (suitKeys.length - 1));
    const cx = TABLE.width / 2 + Math.cos(angle) * 380;
    const cy = 310 + Math.sin(angle) * 60;
    ctx.globalAlpha = 0.9;
    ctx.font = `54px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(suit.glyph, cx, cy);
    ctx.globalAlpha = 1;
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 76px ${FONT_DISPLAY}`;
  ctx.shadowColor = 'rgba(179,140,255,0.6)';
  ctx.shadowBlur = 26;
  ctx.fillText('HEXEN DUEL', TABLE.width / 2, 210);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `italic 23px ${FONT_DISPLAY}`;
  ctx.fillText('a card duel of plane, favor and ruse', TABLE.width / 2, 252);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `19px ${FONT}`;
  ctx.fillText('Five suits. Thirty life. One Hexen across the table.', TABLE.width / 2, 480);
  ctx.fillStyle = PALETTE.plane;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText('Press SPACE or click to begin the duel', TABLE.width / 2, 540);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `14px ${FONT}`;
  ctx.fillText('Mouse: click a card to play it. Keys: 1-9 pick a card, E ends the turn, arrows move the selection.', TABLE.width / 2, 586);
  ctx.fillText(`Duel record: ${record.wins} won \u00b7 ${record.losses} lost`, TABLE.width / 2, 614);
  ctx.textAlign = 'left';
  drawVignette(ctx);
}

function paintEnd(ctx, duel, won, record) {
  paintTable(ctx, duel, { selected: -1 }, []);
  ctx.fillStyle = won ? 'rgba(18,42,26,0.74)' : 'rgba(44,14,16,0.74)';
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.gold : PALETTE.danger;
  ctx.font = `bold 86px ${FONT_DISPLAY}`;
  ctx.shadowColor = won ? 'rgba(242,201,76,0.7)' : 'rgba(226,86,78,0.7)';
  ctx.shadowBlur = 30;
  ctx.fillText(won ? 'VICTORY' : 'DEFEAT', TABLE.width / 2, 286);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `23px ${FONT}`;
  const verdict = won
    ? `The Hexen falls at ${Math.max(0, duel.foe.life)} life, beaten by your ${duel.turnCount} turns of plane and favor.`
    : `The Hexen outlasted you: you held ${Math.max(0, duel.player.life)} life after ${duel.turnCount} turns.`;
  ctx.fillText(verdict, TABLE.width / 2, 344);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Record: ${record.wins} won \u00b7 ${record.losses} lost`, TABLE.width / 2, 392);
  ctx.fillStyle = PALETTE.plane;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText('Press SPACE for a new duel', TABLE.width / 2, 462);
  ctx.textAlign = 'left';
  drawVignette(ctx);
}

function paintPause(ctx, duel) {
  paintTable(ctx, duel, { selected: -1 }, []);
  ctx.fillStyle = 'rgba(8,10,18,0.8)';
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 56px ${FONT_DISPLAY}`;
  ctx.fillText('PAUSED', TABLE.width / 2, 340);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Press P or ESC to resume', TABLE.width / 2, 390);
  ctx.textAlign = 'left';
}

/** Create the renderer over a canvas element. paint() returns the fresh hit targets. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / TABLE.width, height / TABLE.height);
    view.x = (width - TABLE.width * view.scale) / 2;
    view.y = (height - TABLE.height * view.scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function paint(duel, screen, ui, record) {
    const hitTargets = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop0;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) paintTitle(ctx, record);
    else if (screen === SCREEN_WIN) paintEnd(ctx, duel, true, record);
    else if (screen === SCREEN_LOSS) paintEnd(ctx, duel, false, record);
    else if (screen === SCREEN_PAUSE) paintPause(ctx, duel);
    else paintTable(ctx, duel, ui, hitTargets);
    return hitTargets;
  }

  /** A click's position on the canvas mapped into logical table coordinates. */
  function toTable(clientX, clientY, canvasRect) {
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (clientX * ratio - view.x) / view.scale,
      y: (clientY * ratio - view.y) / view.scale,
    };
  }

  return { paint, resize, toTable };
}
