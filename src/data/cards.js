// A curated catalog of well-known trading cards across a few major games.
// Each entry is metadata only (name/set/number/rarity) — no artwork is reproduced.
export const GAMES = [
  { id: 'pokemon', label: 'Pokémon', emoji: '⚡' },
  { id: 'mtg', label: 'Magic: The Gathering', emoji: '🔮' },
  { id: 'sports', label: 'Sports', emoji: '🏀' },
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

  // Sports
  c('spt-jordan-fleer', 'Michael Jordan Rookie', 'sports', '1986 Fleer', '#57', 'ultra-rare'),
  c('spt-lebron-topps', 'LeBron James Rookie', 'sports', '2003 Topps Chrome', '#111', 'ultra-rare'),
  c('spt-mantle-topps', 'Mickey Mantle', 'sports', '1952 Topps', '#311', 'ultra-rare'),
  c('spt-brady-playoff', 'Tom Brady Rookie', 'sports', '2000 Playoff Contenders', '#144', 'ultra-rare'),
  c('spt-kobe-topps', 'Kobe Bryant Rookie', 'sports', '1996 Topps Chrome', '#138', 'ultra-rare'),
  c('spt-messi-panini', 'Lionel Messi', 'sports', 'Panini Prizm', '#1', 'holo-rare'),
  c('spt-curry-panini', 'Stephen Curry', 'sports', 'Panini Select', '#22', 'rare'),
  c('spt-trout-bowman', 'Mike Trout Rookie', 'sports', '2011 Bowman Chrome', '#BDPP40', 'ultra-rare'),
  c('spt-ohtani-topps', 'Shohei Ohtani', 'sports', 'Topps Update', '#US1', 'rare'),
  c('spt-mahomes-panini', 'Patrick Mahomes', 'sports', 'Panini Prizm', '#269', 'holo-rare'),
  c('spt-griffey-upperdeck', 'Ken Griffey Jr. Rookie', 'sports', '1989 Upper Deck', '#1', 'rare'),
  c('spt-jeter-topps', 'Derek Jeter Rookie', 'sports', '1993 Topps', '#98', 'rare'),
  c('spt-wembanyama-panini', 'Victor Wembanyama Rookie', 'sports', 'Panini Prizm', '#1', 'ultra-rare'),
  c('spt-ronaldo-panini', 'Cristiano Ronaldo', 'sports', 'Panini Obsidian', '#1', 'holo-rare'),
  c('spt-caitlin-clark', 'Caitlin Clark Rookie', 'sports', 'Panini Prizm', '#201', 'ultra-rare'),
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
