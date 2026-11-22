// Every tuning number and colour in one place. The table is a fixed 1280x720 logical area; the
// renderer scales it to the window, so no rule below depends on the screen size.

export const TABLE = { width: 1280, height: 720 };

export const CARD_W = 128;
export const CARD_H = 180;
export const HAND_OVERLAP = 34;
export const HAND_LIFT = 26; // how far the selected card lifts

export const LANE = {
  foeHandY: 62,
  foePlayY: 236,
  centerSplit: 388, // the table's horizon: foe's half above, player's below
  playerPlayY: 430,
  handY: 524,
};

export const RULES = {
  LIFE_MAX: 30,
  PLANE_BASE: 3,
  PLANE_MAX_CAP: 6,
  HAND_SIZE: 5,
};

export const PALETTE = {
  backdrop0: '#0b0d16',
  backdrop1: '#141a2b',
  felt: '#1c2338',
  feltLine: 'rgba(140,160,210,0.14)',
  panel: 'rgba(16,20,34,0.88)',
  panelEdge: 'rgba(120,140,200,0.35)',
  text: '#eef1f8',
  muted: '#9aa3b8',
  gold: '#f2c94c',
  danger: '#e2564e',
  heal: '#9be564',
  plane: '#7fd4ff',
  ward: '#c9d6ff',
  vignette: 'rgba(4,6,12,0.55)',
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
export const FONT_DISPLAY = '"Palatino Linotype", "Book Antiqua", Georgia, serif';

/** Where the record of visits (best-of streaks) is kept in this browser. */
export const RECORD_KEY = 'hexen-duel.record';
