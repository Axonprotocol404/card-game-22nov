# Hexen Duel — dossier

Hexen Duel is an original turn-based card battler for the desktop browser: you versus the Hexen,
30 life each, across a canvas table. Static files only — one HTML page, nine ES modules, no
library, no assets, no network request of any kind. Keyboard and mouse both play it fully.

## The design in one paragraph

Two resources drive every decision. Plane is mana: it refills each turn to your cap, and the cap
grows from 3 to 6 as your Favor counter climbs (1 point of cap per 2 Favor). Favor is a
long-term investment: it is spent passively (bigger plane, and it scales damage and ward on
several cards) and it can be stolen. Ward is temporary shielding that decays by half each turn.
The tension is that Favor scaling wins long games but costs tempo now — every turn you buy
Favor is a turn the Hexen spends hitting you.

## The five suits

- Aegis (⚔, red) — damage and finishers. Slash scales with Favor; Crosscut chains when it
  follows another Aegis card; Duelist's Pride pays 3 damage per Aegis played this turn; Blood
  Pact trades 3 of your life for 7 of the foe's; Meteor is the 9-damage hammer.
- Kite (🪁, blue) — draw and tempo. Scribe draws 2, Tailwind grants +2 plane and a card, Moon
  Letter refills an empty hand, Carousel draws by deck size, Echo replays your last non-Mask
  card for free (the combo enabler).
- Fan (✿, gold) — the Favor engine. Gilded Coin, Silk Banner (Favor per card played this
  turn), Courtly Favor, and Midas Ledger which converts unspent plane into Favor and refills it.
- Lantern (🔥, green) — ward and healing. Ward scales with Favor, Ember Veil converts ward
  into damage, Hearthfire heals 6.
- Mask (🎭, purple) — ruses. Hex taxes the foe's next card by 2, Pickpocket steals Favor and
  discards, Jettison trades dead cards for live ones, Mask of Mirrors copies the foe's last card.

Twenty-eight cards, all distinct, printed with cost, name, suit and rules text; every card is
readable on the table itself.

## The opponent

The Hexen plays by exact simulation, not heuristics: each candidate card is played on a clone of
the real duel, scored with a value function (life leverage, Favor, ward, hand and deck), looking
one card further so it prefers genuine two-card combos. Over 200 seeded duels with both seats
driven by the same AI it wins 91 to the player-seat's 109 — close, never stalled — so it is a
real opponent, beatable with a plan.

## Controls

- Mouse: click a card to select, click again (or click the table) to play; END TURN button.
- Keys: 1–9 play that card directly, arrows/A-D move the selection, E ends the turn, Space
  confirms screens, P pauses.

## Files

- game/src/engine.js — the rules: plane, ward, favor, damage, and every card effect. No DOM.
- game/src/ai.js — the Hexen's simulation-based brain. No DOM.
- game/src/cards.js — the card roster and the five suits.
- game/src/render.js — the canvas painter: vector cards, panels, meters, all four screens.
- game/src/input.js — keyboard and pointer, queued one-shot actions.
- game/src/config.js — every tuning number and colour in one place.
- game/src/shots.js — the deterministic screenshot scenes behind ?shot=.
- game/src/main.js — boot, the frame loop, the screen flow.
- game/src/random.js — seeded mulberry32 RNG and the starting deck.

main.ts at the root hands game/ and screenshots/ to /output with the vendored makefun-game.ts
library, exactly as the starter does; `node serve.ts` serves the game at localhost:8080.

## Verification performed

- node --check on every module.
- Headless Chromium (Playwright, chrome-headless-shell) loads every screen: zero console errors,
  zero page errors, zero network requests beyond the local server.
- Four screenshots (1280x720 JPEG, all under 256 KiB): title, mid-duel table, victory, defeat.
- 200 full AI-vs-AI duels: no stalls, plausible win rates.
