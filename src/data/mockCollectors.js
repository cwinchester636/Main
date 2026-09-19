// Mock "nearby collectors" so the matching experience can be demoed without
// a real backend/auth/geolocation service. Swap this module for a live API
// and the rest of the app (matching.js, MatchesView) keeps working as-is.
const collector = (id, name, avatar, distanceMi, haves, wants) => ({
  id,
  name,
  avatar,
  distanceMi,
  haves,
  wants,
})

export const MOCK_COLLECTORS = [
  collector('u1', 'Maya R.', '🦊', 0.8, [
    'pkmn-charizard-base', 'pkmn-pikachu-base', 'pkmn-eevee-cel', 'ygo-raigeki', 'mtg-lightning-bolt',
  ], [
    'pkmn-umbreon-gg', 'mtg-sol-ring', 'ygo-jinzo', 'pkmn-gengar-fright',
  ]),
  collector('u2', 'Devon K.', '🐢', 1.4, [
    'mtg-black-lotus', 'mtg-mox-sapphire', 'mtg-tarmogoyf', 'mtg-counterspell', 'mtg-birds-of-paradise',
  ], [
    'pkmn-mewtwo-base', 'pkmn-mew-promo', 'ygo-exodia', 'mtg-ragavan',
  ]),
  collector('u3', 'Priya S.', '🐼', 2.1, [
    'ygo-blue-eyes', 'ygo-dark-magician', 'ygo-red-eyes', 'ygo-summoned-skull', 'pkmn-snorlax-jungle',
  ], [
    'pkmn-charizard-base', 'ygo-slifer', 'mtg-liliana-vess',
  ]),
  collector('u4', 'Owen T.', '🐸', 0.5, [
    'pkmn-umbreon-gg', 'pkmn-rayquaza-gg', 'pkmn-sylveon-vmax', 'pkmn-zoroark-swsh', 'mtg-ragavan',
  ], [
    'pkmn-charizard-base', 'pkmn-lugia-neo', 'ygo-black-luster', 'pkmn-gyarados-base',
  ]),
  collector('u5', 'Ines L.', '🦉', 3.6, [
    'ygo-ash-blossom', 'ygo-ancient-gear-golem', 'ygo-sparkman', 'ygo-mirror-force', 'ygo-pot-of-greed',
  ], [
    'pkmn-lucario-gx', 'mtg-teferi-time', 'ygo-jinzo', 'ygo-blue-eyes-ultimate',
  ]),
  collector('u6', 'Marcus B.', '🐨', 1.9, [
    'pkmn-gengar-fright', 'pkmn-machamp-base', 'pkmn-dragonite-fossil', 'pkmn-gyarados-base', 'mtg-goblin-guide',
  ], [
    'pkmn-pikachu-base', 'pkmn-jigglypuff-base', 'mtg-wrenn-six', 'ygo-red-eyes',
  ]),
  collector('u7', 'Sofia G.', '🐯', 0.2, [
    'mtg-jace-tms', 'mtg-liliana-vess', 'mtg-teferi-time', 'mtg-wrenn-six', 'mtg-swords-plow',
  ], [
    'mtg-black-lotus', 'mtg-tarmogoyf', 'pkmn-lugia-neo', 'ygo-summoned-skull',
  ]),
  collector('u8', 'Aaron W.', '🦁', 4.2, [
    'ygo-black-luster', 'ygo-jinzo', 'ygo-slifer', 'ygo-blue-eyes-ultimate', 'pkmn-lucario-gx',
  ], [
    'ygo-blue-eyes', 'ygo-dark-magician', 'pkmn-rayquaza-gg', 'mtg-elesh-norn',
  ]),
  collector('u9', 'Hana C.', '🐰', 1.1, [
    'pkmn-eevee-cel', 'pkmn-jigglypuff-base', 'pkmn-pikachu-base', 'pkmn-snorlax-jungle', 'mtg-birds-of-paradise',
  ], [
    'pkmn-mew-promo', 'pkmn-umbreon-gg', 'ygo-pot-of-greed', 'mtg-sol-ring',
  ]),
  collector('u10', 'Liam P.', '🐺', 2.8, [
    'mtg-ragavan', 'mtg-tarmogoyf', 'mtg-sol-ring', 'mtg-elesh-norn', 'ygo-ancient-gear-golem',
  ], [
    'mtg-black-lotus', 'mtg-mox-sapphire', 'pkmn-mewtwo-base', 'ygo-exodia',
  ]),
  collector('u11', 'Noor A.', '🦋', 0.9, [
    'ygo-ash-blossom', 'pkmn-lucario-gx', 'pkmn-greninja-bw', 'ygo-sparkman', 'mtg-counterspell',
  ], [
    'pkmn-sylveon-vmax', 'pkmn-zoroark-swsh', 'ygo-mirror-force', 'mtg-liliana-vess',
  ]),
  collector('u12', 'Ezra M.', '🐲', 3.0, [
    'pkmn-lugia-neo', 'pkmn-mew-promo', 'pkmn-mewtwo-base', 'pkmn-charizard-base', 'mtg-counterspell',
  ], [
    'mtg-jace-tms', 'ygo-slifer', 'pkmn-dragonite-fossil', 'ygo-black-luster',
  ]),
  collector('u13', 'Talia F.', '🐝', 1.6, [
    'ygo-red-eyes', 'ygo-summoned-skull', 'ygo-mirror-force', 'mtg-lightning-bolt', 'mtg-goblin-guide',
  ], [
    'ygo-blue-eyes', 'mtg-black-lotus', 'pkmn-eevee-cel', 'pkmn-venusaur-base',
  ]),
  collector('u14', 'Diego V.', '🦎', 2.4, [
    'pkmn-venusaur-base', 'pkmn-blastoise-base', 'pkmn-gyarados-base', 'pkmn-dragonite-fossil', 'mtg-swords-plow',
  ], [
    'pkmn-charizard-base', 'pkmn-machamp-base', 'mtg-ragavan', 'ygo-exodia',
  ]),
  collector('u15', 'Kenji O.', '🐧', 0.6, [
    'ygo-blue-eyes', 'ygo-dark-magician', 'ygo-red-eyes', 'ygo-pot-of-greed', 'ygo-raigeki',
  ], [
    'ygo-exodia', 'ygo-black-luster', 'mtg-jace-tms', 'pkmn-charizard-base',
  ]),
  collector('u16', 'Aiko S.', '🐹', 1.3, [
    'ygo-exodia', 'ygo-mirror-force', 'ygo-sparkman', 'ygo-ancient-gear-golem', 'pkmn-pikachu-base',
  ], [
    'ygo-blue-eyes', 'ygo-jinzo', 'mtg-tarmogoyf', 'pkmn-umbreon-gg',
  ]),
  collector('u17', 'Sana K.', '🐴', 1.8, [
    'ygo-jinzo', 'ygo-ancient-gear-golem', 'mtg-elesh-norn', 'pkmn-lucario-gx', 'ygo-slifer',
  ], [
    'ygo-black-luster', 'mtg-teferi-time', 'pkmn-zoroark-swsh', 'pkmn-charizard-base',
  ]),
]
