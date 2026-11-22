// cards.js — the card roster and the five suits of Hexen Duel.
// Authored fresh for the best-card-game competition entry.

export const SUITS = {
  aegis: { glyph: '⚔', name: 'Aegis', colour: 'aegis' },
  kite: { glyph: '🪁', name: 'Kite', colour: 'kite' },
  fan: { glyph: '✿', name: 'Fan', colour: 'fan' },
  lantern: { glyph: '🔥', name: 'Lantern', colour: 'lantern' },
  mask: { glyph: '🎭', name: 'Mask', colour: 'mask' },
};

// Every card: id, suit, cost (plane), name, and one-line rules text.
export const CARDS = {
  slash: { suit: 'aegis', cost: 1, name: 'Slash', text: 'Deal 2 + half Favor damage.' },
  crosscut: { suit: 'aegis', cost: 2, name: 'Crosscut', text: 'Deal 3. +2 if an Aegis was played this turn.' },
  duelist_pride: { suit: 'aegis', cost: 3, name: "Duelist's Pride", text: 'Deal 3 per Aegis played this turn.' },
  blood_pact: { suit: 'aegis', cost: 1, name: 'Blood Pact', text: 'Lose 3 life; deal 7 to the foe.' },
  meteor: { suit: 'aegis', cost: 5, name: 'Meteor', text: 'Deal 9 damage.' },
  scribe: { suit: 'kite', cost: 1, name: 'Scribe', text: 'Draw 2 cards.' },
  tailwind: { suit: 'kite', cost: 1, name: 'Tailwind', text: '+2 plane now and draw 1.' },
  moon_letter: { suit: 'kite', cost: 2, name: 'Moon Letter', text: 'If hand is empty, refill to 5. Else draw 1.' },
  carousel: { suit: 'kite', cost: 2, name: 'Carousel', text: 'Draw 1 per 6 cards left in your deck.' },
  echo: { suit: 'kite', cost: 2, name: 'Echo', text: 'Replay your last card this turn for free.' },
  swiftriver: { suit: 'kite', cost: 3, name: 'Swift River', text: 'Deal 2; draw 2; foe loses 1 plane.' },
  gilded_coin: { suit: 'fan', cost: 1, name: 'Gilded Coin', text: 'Gain 2 Favor.' },
  silk_banner: { suit: 'fan', cost: 1, name: 'Silk Banner', text: 'Gain 1 Favor per card played this turn.' },
  courtly_favor: { suit: 'fan', cost: 2, name: 'Courtly Favor', text: 'Gain 3 Favor; heal 2.' },
  midas_ledger: { suit: 'fan', cost: 2, name: 'Midas Ledger', text: 'Convert unspent plane to Favor, then refill plane.' },
  pearl_dowry: { suit: 'fan', cost: 3, name: 'Pearl Dowry', text: 'Gain 4 Favor and 2 ward.' },
  ward_charm: { suit: 'lantern', cost: 1, name: 'Ward Charm', text: 'Gain 2 + half Favor ward.' },
  ember_veil: { suit: 'lantern', cost: 2, name: 'Ember Veil', text: 'Deal damage equal to your ward; lose half of it.' },
  hearthfire: { suit: 'lantern', cost: 2, name: 'Hearthfire', text: 'Heal 6 life.' },
  everflame: { suit: 'lantern', cost: 3, name: 'Everflame', text: 'Gain 4 ward; deal 3 if Favor >= 8.' },
  hex: { suit: 'mask', cost: 1, name: 'Hex', text: "Foe's next card costs 2 more." },
  pickpocket: { suit: 'mask', cost: 1, name: 'Pickpocket', text: 'Steal 2 Favor; foe discards 1 at random.' },
  jettison: { suit: 'mask', cost: 1, name: 'Jettison', text: 'Discard your hand; draw that many minus 1.' },
  mask_of_mirrors: { suit: 'mask', cost: 3, name: 'Mask of Mirrors', text: "Copy and play the foe's last card." },
};

export function card(id) {
  return CARDS[id];
}
