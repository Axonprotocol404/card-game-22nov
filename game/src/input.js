// input.js — keyboard and pointer, queued as one-shot actions the frame loop
// consumes. No game logic lives here.
// Authored fresh for the best-card-game competition entry.

export function createInput(canvas) {
  const actions = [];
  let hover = null; // {x, y}

  function push(action) {
    actions.push(action);
  }

  canvas.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k >= '1' && k <= '9') push({ type: 'playIndex', index: Number(k) - 1 });
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') push({ type: 'move', dx: -1 });
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') push({ type: 'move', dx: 1 });
    else if (k === 'Enter' || k === 'e' || k === 'E') push({ type: 'endTurn' });
    else if (k === ' ' || k === 'Spacebar') push({ type: 'confirm' });
    else if (k === 'p' || k === 'P') push({ type: 'pause' });
    else return;
    e.preventDefault();
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    hover = {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  });

  canvas.addEventListener('mouseleave', () => {
    hover = null;
  });

  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    push({ type: 'click', x, y });
    e.preventDefault();
  });

  return {
    drain() {
      const out = actions.splice(0);
      return { actions: out, hover };
    },
  };
}
