// The duel's vocabulary: suits and the roster of named cards. Every card is one object here;
// deck building and combat in engine.js only ever reference these, so adding a card means one
// entry and nothing else. The five suits each bend the duel differently: Aggression (Aegis) hits,
// Alacrity (Kite) draws and accelerates, Favor (Fan) scales the plane, Ward (Lantern) defends and
// heals, and Ruse (Mask) manipulates the hand itself.
export const SUITS = {
  aegis: { name: 'Aegis', glyph: '⚔', color: '#e2564e', dark: '#3a1210', blurb: 'Strike & power' },
  kite: { name: 'Kite', glyph: '🪁', color: '#4fc3f7', dark: '#0d2436', blurb: 'Draw & flow' },
  fan: { name: 'Fan', glyph: '✿', color: '#f2c94c', dark: '#372a0d', blurb: 'Favor & scaling' },
  lantern: { name: 'Lantern', glyph: '🔥', color: '#9be564', dark: '#1c2f12', blurb: 'Ward & mend' },
  mask: { name: 'Mask', glyph: '🎭', color: '#b38cff', dark: '#241436', blurb: 'Ruse & discard' },
};

// One entry per card. `text` is what the table prints on the card; `cost` is its plane cost.
export const CARDS = {
  // — Aegis: damage, pressure, finishing power —
  slash: { suit: 'aegis', cost: 1, name: 'Slash', text: 'Deal 4 damage.' },
  crosscut: { suit: 'aegis', cost: 2, name: 'Crosscut', text: 'Deal 3 damage. Deal 3 again if your last card this turn was also Aegis.' },
  meteor: { suit: 'aegis', cost: 3, name: 'Meteor', text: 'Deal 9 damage. Spend 2 extra plane if you played a Lantern card this turn.' },
  bloodpact: { suit: 'aegis', cost: 0, name: 'Blood Pact', text: 'Deal 7 damage. Pay 3 of your own life.' },
  duel: { suit: 'aegis', cost: 2, name: 'Duelist\u2019s Pride', text: 'Deal 3 damage, +3 more for every Aegis card you played this turn (counting this one).' },

  // — Kite: card advantage and plane tempo —
  scribe: { suit: 'kite', cost: 1, name: 'Scribe', text: 'Draw 2 cards.' },
  tailwind: { suit: 'kite', cost: 1, name: 'Tailwind', text: 'Gain +2 plane this turn. Draw 1 card.' },
  moonletter: { suit: 'kite', cost: 0, name: 'Moon Letter', text: 'Draw 1 card. If your hand is empty after, draw 2 more.' },
  carousel: { suit: 'kite', cost: 2, name: 'Carousel', text: 'Draw 1 card for every 5 cards left in your draw pile (round down, at least 1).' },
  echo: { suit: 'kite', cost: 2, name: 'Echo of Waves', text: 'Repeat the last non-Mask card you played this turn at no cost.' },

  // — Fan: scaling economy —
  coin: { suit: 'fan', cost: 0, name: 'Gilded Coin', text: 'Gain 3 favor.' },
  silk: { suit: 'fan', cost: 1, name: 'Silk Banner', text: 'Gain 2 favor for every card you played this turn before this one.' },
  favor: { suit: 'fan', cost: 2, name: 'Courtly Favor', text: 'Gain 6 favor. Heal 2 life.' },
  midas: { suit: 'fan', cost: 3, name: 'Midas Ledger', text: 'Gain favor equal to your plane left, then refill your plane.' },

  // — Lantern: defense and healing —
  ward: { suit: 'lantern', cost: 1, name: 'Ward', text: 'Gain 5 ward.' },
  bulwark: { suit: 'lantern', cost: 2, name: 'Bulwark', text: 'Gain 8 ward. Heal 2 life.' },
  emberveil: { suit: 'lantern', cost: 1, name: 'Ember Veil', text: 'Gain 3 ward. Deal 2 damage for every 5 ward you have.' },
  hearth: { suit: 'lantern', cost: 2, name: 'Hearthfire', text: 'Heal 6 life. Gain 1 favor.' },

  // — Mask: hand manipulation —
  pickpocket: { suit: 'mask', cost: 1, name: 'Pickpocket', text: 'Steal 3 favor. The foe discards a random card.' },
  jettison: { suit: 'mask', cost: 0, name: 'Jettison', text: 'Discard any number of cards, then draw that many +1.' },
  hex: { suit: 'mask', cost: 2, name: 'Hex of Hush', text: 'The foe\u2019s next card this turn costs 2 more.' },
  mirror: { suit: 'mask', cost: 1, name: 'Mask of Mirrors', text: 'Copy the last card the foe played this turn.' },
};

export const CARD_LIST = Object.keys(CARDS);
