// A curated catalog of well-known trading cards across a few major games.
// Each entry is metadata only (name/set/number/rarity) — no artwork is reproduced.
export const GAMES = [
  { id: 'pokemon', label: 'Pokémon', emoji: '⚡' },
  { id: 'mtg', label: 'Magic: The Gathering', emoji: '🔮' },
  { id: 'yugioh', label: 'Yu-Gi-Oh!', emoji: '🐉' },
]

export const RARITIES = ['common', 'uncommon', 'rare', 'holo-rare', 'ultra-rare']

const c = (id, name, game, set, number, rarity) => ({ id, name, game, set, number, rarity })

export const CARDS = [
  // Pokémon
  c('pkmn-charizard-base', 'Charizard', 'pokemon', 'Base Set', '4/102', 'ultra-rare'),
  c('pkmn-pikachu-base', 'Pikachu', 'pokemon', 'Base Set', '58/102', 'common'),
  c('pkmn-blastoise-base', 'Blastoise', 'pokemon', 'Base Set', '2/102', 'rare'),
  c('pkmn-venusaur-base', 'Venusaur', 'pokemon', 'Base Set', '15/102', 'rare'),
  c('pkmn-mewtwo-base', 'Mewtwo', 'pokemon', 'Base Set', '10/102', 'holo-rare'),
  c('pkmn-mew-promo', 'Mew', 'pokemon', 'Promo', '#8', 'ultra-rare'),
  c('pkmn-lugia-neo', 'Lugia', 'pokemon', 'Neo Genesis', '9/111', 'ultra-rare'),
  c('pkmn-umbreon-gg', 'Umbreon VMAX', 'pokemon', 'Evolving Skies', '095/203', 'ultra-rare'),
  c('pkmn-rayquaza-gg', 'Rayquaza VMAX', 'pokemon', 'Evolving Skies', '111/203', 'ultra-rare'),
  c('pkmn-eevee-cel', 'Eevee', 'pokemon', 'Celebrations', '016/025', 'common'),
  c('pkmn-gengar-fright', 'Gengar', 'pokemon', 'Fright Night', '045/078', 'rare'),
  c('pkmn-snorlax-jungle', 'Snorlax', 'pokemon', 'Jungle', '30/64', 'uncommon'),
  c('pkmn-gyarados-base', 'Gyarados', 'pokemon', 'Base Set', '6/102', 'rare'),
  c('pkmn-jigglypuff-base', 'Jigglypuff', 'pokemon', 'Base Set', '54/102', 'common'),
  c('pkmn-dragonite-fossil', 'Dragonite', 'pokemon', 'Fossil', '5/62', 'rare'),
  c('pkmn-machamp-base', 'Machamp', 'pokemon', 'Base Set', '8/102', 'holo-rare'),
  c('pkmn-sylveon-vmax', 'Sylveon VMAX', 'pokemon', 'Evolving Skies', '143/203', 'ultra-rare'),
  c('pkmn-greninja-bw', 'Greninja', 'pokemon', 'Furious Fists', '40/111', 'rare'),
  c('pkmn-lucario-gx', 'Lucario GX', 'pokemon', 'Guardians Rising', '78/145', 'holo-rare'),
  c('pkmn-zoroark-swsh', 'Zoroark VSTAR', 'pokemon', 'Lost Origin', '159/196', 'ultra-rare'),

  // Magic: The Gathering
  c('mtg-black-lotus', 'Black Lotus', 'mtg', 'Alpha', '#232', 'ultra-rare'),
  c('mtg-mox-sapphire', 'Mox Sapphire', 'mtg', 'Alpha', '#264', 'ultra-rare'),
  c('mtg-jace-tms', 'Jace, the Mind Sculptor', 'mtg', 'Worldwake', '#31', 'ultra-rare'),
  c('mtg-tarmogoyf', 'Tarmogoyf', 'mtg', 'Future Sight', '#132', 'rare'),
  c('mtg-liliana-vess', 'Liliana of the Veil', 'mtg', 'Innistrad', '#106', 'holo-rare'),
  c('mtg-goblin-guide', 'Goblin Guide', 'mtg', 'Zendikar', '#146', 'uncommon'),
  c('mtg-lightning-bolt', 'Lightning Bolt', 'mtg', 'Limited Edition', '#162', 'common'),
  c('mtg-sol-ring', 'Sol Ring', 'mtg', 'Commander', '#241', 'uncommon'),
  c('mtg-teferi-time', 'Teferi, Time Raveler', 'mtg', 'War of the Spark', '#221', 'holo-rare'),
  c('mtg-wrenn-six', 'Wrenn and Six', 'mtg', 'Modern Horizons', '#18', 'holo-rare'),
  c('mtg-ragavan', 'Ragavan, Nimble Pilferer', 'mtg', 'Modern Horizons 2', '#138', 'ultra-rare'),
  c('mtg-counterspell', 'Counterspell', 'mtg', 'Limited Edition', '#88', 'common'),
  c('mtg-birds-of-paradise', 'Birds of Paradise', 'mtg', 'Limited Edition', '#225', 'uncommon'),
  c('mtg-swords-plow', 'Swords to Plowshares', 'mtg', 'Limited Edition', '#20', 'common'),
  c('mtg-elesh-norn', 'Elesh Norn', 'mtg', 'Phyrexia: All Will Be One', '#10', 'holo-rare'),

  // Yu-Gi-Oh!
  c('ygo-blue-eyes', 'Blue-Eyes White Dragon', 'yugioh', 'Legend of Blue Eyes White Dragon', 'LOB-001', 'ultra-rare'),
  c('ygo-dark-magician', 'Dark Magician', 'yugioh', 'Legend of Blue Eyes White Dragon', 'LOB-005', 'ultra-rare'),
  c('ygo-red-eyes', 'Red-Eyes Black Dragon', 'yugioh', 'Legend of Blue Eyes White Dragon', 'LOB-070', 'rare'),
  c('ygo-exodia', 'Exodia the Forbidden One', 'yugioh', 'Legend of Blue Eyes White Dragon', 'LOB-124', 'ultra-rare'),
  c('ygo-summoned-skull', 'Summoned Skull', 'yugioh', 'Legend of Blue Eyes White Dragon', 'LOB-093', 'rare'),
  c('ygo-mirror-force', 'Mirror Force', 'yugioh', 'Metal Raiders', 'MRD-141', 'holo-rare'),
  c('ygo-pot-of-greed', 'Pot of Greed', 'yugioh', 'Starter Deck: Yugi', 'SDY-041', 'common'),
  c('ygo-raigeki', 'Raigeki', 'yugioh', 'Metal Raiders', 'MRD-143', 'common'),
  c('ygo-sparkman', 'Elemental Hero Sparkman', 'yugioh', 'Legacy of Darkness', 'LOD-005', 'rare'),
  c('ygo-black-luster', 'Black Luster Soldier', 'yugioh', 'Magic Ruler', 'MRL-000', 'ultra-rare'),
  c('ygo-jinzo', 'Jinzo', 'yugioh', 'Pharaoh’s Servant', 'PGD-024', 'holo-rare'),
  c('ygo-ash-blossom', 'Ash Blossom & Joyous Spring', 'yugioh', 'Maximum Crisis', 'MACR-EN035', 'rare'),
  c('ygo-ancient-gear-golem', 'Ancient Gear Golem', 'yugioh', 'Invasion of Chaos', 'IOC-020', 'rare'),
  c('ygo-slifer', 'Slifer the Sky Dragon', 'yugioh', 'Collectible Tins Promo', 'MOV-EN001', 'ultra-rare'),
  c('ygo-blue-eyes-ultimate', 'Blue-Eyes Ultimate Dragon', 'yugioh', 'Legend of Blue Eyes White Dragon', 'LOB-127', 'ultra-rare'),
]

export const cardById = (id) => CARDS.find((card) => card.id === id)

export function searchCards(query, gameFilter) {
  const q = query.trim().toLowerCase()
  return CARDS.filter((card) => {
    if (gameFilter && gameFilter !== 'all' && card.game !== gameFilter) return false
    if (!q) return true
    return (
      card.name.toLowerCase().includes(q) ||
      card.set.toLowerCase().includes(q) ||
      card.number.toLowerCase().includes(q)
    )
  })
}
