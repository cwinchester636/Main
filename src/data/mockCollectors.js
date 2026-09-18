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
    'pkmn-charizard-base', 'pkmn-pikachu-base', 'pkmn-eevee-cel', 'mtg-lightning-bolt', 'spt-curry-panini',
  ], [
    'pkmn-umbreon-gg', 'mtg-sol-ring', 'spt-mahomes-panini', 'pkmn-gengar-fright',
  ]),
  collector('u2', 'Devon K.', '🐢', 1.4, [
    'mtg-black-lotus', 'mtg-mox-sapphire', 'mtg-tarmogoyf', 'mtg-counterspell', 'mtg-birds-of-paradise',
  ], [
    'pkmn-mewtwo-base', 'pkmn-mew-promo', 'spt-jordan-fleer', 'mtg-ragavan',
  ]),
  collector('u3', 'Priya S.', '🐼', 2.1, [
    'spt-jordan-fleer', 'spt-kobe-topps', 'spt-jeter-topps', 'spt-griffey-upperdeck', 'pkmn-snorlax-jungle',
  ], [
    'pkmn-charizard-base', 'spt-caitlin-clark', 'mtg-liliana-vess',
  ]),
  collector('u4', 'Owen T.', '🐸', 0.5, [
    'pkmn-umbreon-gg', 'pkmn-rayquaza-gg', 'pkmn-sylveon-vmax', 'pkmn-zoroark-swsh', 'mtg-ragavan',
  ], [
    'pkmn-charizard-base', 'pkmn-lugia-neo', 'spt-wembanyama-panini', 'pkmn-gyarados-base',
  ]),
  collector('u5', 'Ines L.', '🦉', 3.6, [
    'spt-messi-panini', 'spt-ronaldo-panini', 'spt-ohtani-topps', 'spt-mahomes-panini', 'spt-curry-panini',
  ], [
    'spt-trout-bowman', 'spt-brady-playoff', 'pkmn-lucario-gx', 'mtg-teferi-time',
  ]),
  collector('u6', 'Marcus B.', '🐨', 1.9, [
    'pkmn-gengar-fright', 'pkmn-machamp-base', 'pkmn-dragonite-fossil', 'pkmn-gyarados-base', 'mtg-goblin-guide',
  ], [
    'pkmn-pikachu-base', 'pkmn-jigglypuff-base', 'mtg-wrenn-six', 'spt-jeter-topps',
  ]),
  collector('u7', 'Sofia G.', '🐯', 0.2, [
    'mtg-jace-tms', 'mtg-liliana-vess', 'mtg-teferi-time', 'mtg-wrenn-six', 'mtg-swords-plow',
  ], [
    'mtg-black-lotus', 'mtg-tarmogoyf', 'pkmn-lugia-neo', 'spt-mantle-topps',
  ]),
  collector('u8', 'Aaron W.', '🦁', 4.2, [
    'spt-trout-bowman', 'spt-brady-playoff', 'spt-mantle-topps', 'spt-wembanyama-panini', 'pkmn-lucario-gx',
  ], [
    'spt-jordan-fleer', 'spt-kobe-topps', 'pkmn-rayquaza-gg', 'mtg-elesh-norn',
  ]),
  collector('u9', 'Hana C.', '🐰', 1.1, [
    'pkmn-eevee-cel', 'pkmn-jigglypuff-base', 'pkmn-pikachu-base', 'pkmn-snorlax-jungle', 'mtg-birds-of-paradise',
  ], [
    'pkmn-mew-promo', 'pkmn-umbreon-gg', 'spt-caitlin-clark', 'mtg-sol-ring',
  ]),
  collector('u10', 'Liam P.', '🐺', 2.8, [
    'mtg-ragavan', 'mtg-tarmogoyf', 'mtg-sol-ring', 'mtg-elesh-norn', 'spt-griffey-upperdeck',
  ], [
    'mtg-black-lotus', 'mtg-mox-sapphire', 'pkmn-mewtwo-base', 'spt-ohtani-topps',
  ]),
  collector('u11', 'Noor A.', '🦋', 0.9, [
    'spt-caitlin-clark', 'spt-wembanyama-panini', 'spt-curry-panini', 'pkmn-lucario-gx', 'pkmn-greninja-bw',
  ], [
    'pkmn-sylveon-vmax', 'pkmn-zoroark-swsh', 'spt-messi-panini', 'mtg-liliana-vess',
  ]),
  collector('u12', 'Ezra M.', '🐲', 3.0, [
    'pkmn-lugia-neo', 'pkmn-mew-promo', 'pkmn-mewtwo-base', 'pkmn-charizard-base', 'mtg-counterspell',
  ], [
    'mtg-jace-tms', 'spt-mantle-topps', 'pkmn-dragonite-fossil', 'spt-brady-playoff',
  ]),
  collector('u13', 'Talia F.', '🐝', 1.6, [
    'spt-jeter-topps', 'spt-griffey-upperdeck', 'spt-kobe-topps', 'mtg-lightning-bolt', 'mtg-goblin-guide',
  ], [
    'spt-jordan-fleer', 'mtg-black-lotus', 'pkmn-eevee-cel', 'pkmn-venusaur-base',
  ]),
  collector('u14', 'Diego V.', '🦎', 2.4, [
    'pkmn-venusaur-base', 'pkmn-blastoise-base', 'pkmn-gyarados-base', 'pkmn-dragonite-fossil', 'mtg-swords-plow',
  ], [
    'pkmn-charizard-base', 'pkmn-machamp-base', 'mtg-ragavan', 'spt-trout-bowman',
  ]),
  collector('u15', 'Kenji O.', '🐧', 0.6, [
    'ygo-blue-eyes', 'ygo-dark-magician', 'ygo-red-eyes', 'ygo-pot-of-greed', 'ygo-raigeki',
  ], [
    'ygo-exodia', 'ygo-black-luster', 'op-luffy-leader', 'ua-gojo',
  ]),
  collector('u16', 'Aiko S.', '🐹', 1.3, [
    'ygo-exodia', 'ygo-mirror-force', 'op-zoro', 'op-nami', 'op-shanks',
  ], [
    'ygo-blue-eyes', 'op-luffy-leader', 'ua-tanjiro', 'ygo-jinzo',
  ]),
  collector('u17', 'Mateo R.', '🐶', 2.0, [
    'op-luffy-leader', 'op-law-leader', 'op-ace', 'op-kaido', 'op-sanji',
  ], [
    'op-shanks', 'op-yamato', 'ua-luffy', 'ygo-summoned-skull',
  ]),
  collector('u18', 'Yuna P.', '🐱', 0.4, [
    'ua-gojo', 'ua-yuji', 'ua-tanjiro', 'ua-nezuko', 'ua-ichigo',
  ], [
    'ua-lelouch', 'ua-levi', 'ygo-ash-blossom', 'op-robin',
  ]),
  collector('u19', 'Theo B.', '🐷', 3.4, [
    'ua-lelouch', 'ua-cc', 'ua-levi', 'ua-eren', 'mtg-tarmogoyf',
  ], [
    'ua-gojo', 'ua-yuji', 'spt-mahomes-panini', 'ygo-ancient-gear-golem',
  ]),
  collector('u20', 'Sana K.', '🐴', 1.8, [
    'ygo-jinzo', 'op-mihawk', 'ua-rukia', 'op-hancock', 'ygo-ancient-gear-golem',
  ], [
    'ygo-black-luster', 'op-katakuri', 'ua-bakugo', 'pkmn-charizard-base',
  ]),
]
