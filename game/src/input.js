// Keyboard and pointer input for a card table: one-shot presses (confirm, end turn, pause) queue
// as bit flags; digit keys and arrow keys select and play cards; the mouse clicks cards directly.
// Every press between frames is taken exactly once.

export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_PAUSE = 4;
export const ACTION_LEFT = 8;
export const ACTION_RIGHT = 8 << 1;
export const ACTION_UP = 8 << 2;
export const ACTION_DOWN = 8 << 3;
/** Digit keys 1..9 and 0 arrive as ACTION_DIGIT | digit (0 encodes as 10). */
export const ACTION_DIGIT = 8 << 4;

const CONFIRM = new Set(['Space', 'Enter']);
const ENDTURN = new Set(['KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const LEFTKEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHTKEYS = new Set(['ArrowRight', 'KeyD']);
const UPKEYS = new Set(['ArrowUp', 'KeyW']);
const DOWNKEYS = new Set(['ArrowDown', 'KeyS']);
const DIGITS = { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5, Digit6: 6, Digit7: 7, Digit8: 8, Digit9: 9, Digit0: 10 };

export function createInput(target) {
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (ENDTURN.has(event.code)) { if (!event.repeat) actions |= ACTION_END_TURN; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (LEFTKEYS.has(event.code)) { if (!event.repeat) actions |= ACTION_LEFT; }
    else if (RIGHTKEYS.has(event.code)) { if (!event.repeat) actions |= ACTION_RIGHT; }
    else if (UPKEYS.has(event.code)) { if (!event.repeat) actions |= ACTION_UP; }
    else if (DOWNKEYS.has(event.code)) { if (!event.repeat) actions |= ACTION_DOWN; }
    else if (DIGITS[event.code] !== undefined && !event.repeat) {
      actions |= ACTION_DIGIT | DIGITS[event.code];
    } else return;
    event.preventDefault();
  });

  // The mouse plays a card by clicking it and ends the turn by clicking the button; the renderer
  // maps clicks to actions, so the input layer only exposes the queue and a way to add to it.
  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Push an action in from outside the keyboard (a mouse click on a card or button). */
    push(action) {
      actions |= action;
    },
    /** Clear everything pending (used on screen changes so a stray press does not leak over). */
    clear() {
      actions = 0;
    },
  };
}
