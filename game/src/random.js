// A seeded RNG (mulberry32): the same seed replays the same duel, which is what makes the
// screenshot scenes deterministic and the AI's shuffles fair to test.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh shuffled deck of card ids, drawn from the standard duel library. */
export function startingDeck(random) {
  const recipe = [
    'slash', 'slash', 'slash', 'crosscut', 'crosscut', 'meteor', 'bloodpact', 'duel',
    'scribe', 'scribe', 'tailwind', 'moonletter', 'carousel', 'echo',
    'coin', 'coin', 'silk', 'favor', 'midas',
    'ward', 'ward', 'bulwark', 'emberveil', 'hearth',
    'pickpocket', 'jettison', 'hex', 'mirror',
  ];
  return shuffle(recipe.slice(), random);
}

export function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
