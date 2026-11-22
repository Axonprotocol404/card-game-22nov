// random.js — seeded mulberry32 RNG and the shuffled starting deck.
// Authored fresh for the best-card-game competition entry.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The starting deck: a fixed copy-count recipe so both seats draw from the
// same 30-card pool, shuffled per seat.
const RECIPE = [
  ['slash', 3], ['crosscut', 2], ['duelist_pride', 1], ['blood_pact', 1], ['meteor', 1],
  ['scribe', 2], ['tailwind', 2], ['moon_letter', 1], ['carousel', 1], ['echo', 1], ['swiftriver', 1],
  ['gilded_coin', 2], ['silk_banner', 1], ['courtly_favor', 1], ['midas_ledger', 1], ['pearl_dowry', 1],
  ['ward_charm', 2], ['ember_veil', 1], ['hearthfire', 1], ['everflame', 1],
  ['hex', 1], ['pickpocket', 1], ['jettison', 1], ['mask_of_mirrors', 1],
];

export function buildDeckList() {
  const list = [];
  for (const [id, count] of RECIPE) {
    for (let i = 0; i < count; i++) list.push(id);
  }
  return list;
}

export function shuffledDeck(rng) {
  const deck = buildDeckList();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
