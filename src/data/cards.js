// A curated catalog of well-known trading cards across a few major games.
// Each entry is metadata only (name/set/rarity) — no artwork is reproduced.
export const GAMES = [
  { id: 'pokemon', label: 'Pokémon', emoji: '⚡' },
  { id: 'mtg', label: 'Magic: The Gathering', emoji: '🔮' },
  { id: 'sports', label: 'Sports', emoji: '🏀' },
]

export const RARITIES = ['common', 'uncommon', 'rare', 'holo-rare', 'ultra-rare']

const c = (id, name, game, set, rarity) => ({ id, name, game, set, rarity })

export const CARDS = [
  // Pokémon
  c('pkmn-charizard-base', 'Charizard', 'pokemon', 'Base Set', 'ultra-rare'),
  c('pkmn-pikachu-base', 'Pikachu', 'pokemon', 'Base Set', 'common'),
  c('pkmn-blastoise-base', 'Blastoise', 'pokemon', 'Base Set', 'rare'),
  c('pkmn-venusaur-base', 'Venusaur', 'pokemon', 'Base Set', 'rare'),
  c('pkmn-mewtwo-base', 'Mewtwo', 'pokemon', 'Base Set', 'holo-rare'),
  c('pkmn-mew-promo', 'Mew', 'pokemon', 'Promo', 'ultra-rare'),
  c('pkmn-lugia-neo', 'Lugia', 'pokemon', 'Neo Genesis', 'ultra-rare'),
  c('pkmn-umbreon-gg', 'Umbreon VMAX', 'pokemon', 'Evolving Skies', 'ultra-rare'),
  c('pkmn-rayquaza-gg', 'Rayquaza VMAX', 'pokemon', 'Evolving Skies', 'ultra-rare'),
  c('pkmn-eevee-cel', 'Eevee', 'pokemon', 'Celebrations', 'common'),
  c('pkmn-gengar-fright', 'Gengar', 'pokemon', 'Fright Night', 'rare'),
  c('pkmn-snorlax-jungle', 'Snorlax', 'pokemon', 'Jungle', 'uncommon'),
  c('pkmn-gyarados-base', 'Gyarados', 'pokemon', 'Base Set', 'rare'),
  c('pkmn-jigglypuff-base', 'Jigglypuff', 'pokemon', 'Base Set', 'common'),
  c('pkmn-dragonite-fossil', 'Dragonite', 'pokemon', 'Fossil', 'rare'),
  c('pkmn-machamp-base', 'Machamp', 'pokemon', 'Base Set', 'holo-rare'),
  c('pkmn-sylveon-vmax', 'Sylveon VMAX', 'pokemon', 'Evolving Skies', 'ultra-rare'),
  c('pkmn-greninja-bw', 'Greninja', 'pokemon', 'Furious Fists', 'rare'),
  c('pkmn-lucario-gx', 'Lucario GX', 'pokemon', 'Guardians Rising', 'holo-rare'),
  c('pkmn-zoroark-swsh', 'Zoroark VSTAR', 'pokemon', 'Lost Origin', 'ultra-rare'),

  // Magic: The Gathering
  c('mtg-black-lotus', 'Black Lotus', 'mtg', 'Alpha', 'ultra-rare'),
  c('mtg-mox-sapphire', 'Mox Sapphire', 'mtg', 'Alpha', 'ultra-rare'),
  c('mtg-jace-tms', 'Jace, the Mind Sculptor', 'mtg', 'Worldwake', 'ultra-rare'),
  c('mtg-tarmogoyf', 'Tarmogoyf', 'mtg', 'Future Sight', 'rare'),
  c('mtg-liliana-vess', 'Liliana of the Veil', 'mtg', 'Innistrad', 'holo-rare'),
  c('mtg-goblin-guide', 'Goblin Guide', 'mtg', 'Zendikar', 'uncommon'),
  c('mtg-lightning-bolt', 'Lightning Bolt', 'mtg', 'Limited Edition', 'common'),
  c('mtg-sol-ring', 'Sol Ring', 'mtg', 'Commander', 'uncommon'),
  c('mtg-teferi-time', 'Teferi, Time Raveler', 'mtg', 'War of the Spark', 'holo-rare'),
  c('mtg-wrenn-six', 'Wrenn and Six', 'mtg', 'Modern Horizons', 'holo-rare'),
  c('mtg-ragavan', 'Ragavan, Nimble Pilferer', 'mtg', 'Modern Horizons 2', 'ultra-rare'),
  c('mtg-counterspell', 'Counterspell', 'mtg', 'Limited Edition', 'common'),
  c('mtg-birds-of-paradise', 'Birds of Paradise', 'mtg', 'Limited Edition', 'uncommon'),
  c('mtg-swords-plow', 'Swords to Plowshares', 'mtg', 'Limited Edition', 'common'),
  c('mtg-elesh-norn', 'Elesh Norn', 'mtg', 'Phyrexia: All Will Be One', 'holo-rare'),

  // Sports
  c('spt-jordan-fleer', 'Michael Jordan Rookie', 'sports', '1986 Fleer', 'ultra-rare'),
  c('spt-lebron-topps', 'LeBron James Rookie', 'sports', '2003 Topps Chrome', 'ultra-rare'),
  c('spt-mantle-topps', 'Mickey Mantle', 'sports', '1952 Topps', 'ultra-rare'),
  c('spt-brady-playoff', 'Tom Brady Rookie', 'sports', '2000 Playoff Contenders', 'ultra-rare'),
  c('spt-kobe-topps', 'Kobe Bryant Rookie', 'sports', '1996 Topps Chrome', 'ultra-rare'),
  c('spt-messi-panini', 'Lionel Messi', 'sports', 'Panini Prizm', 'holo-rare'),
  c('spt-curry-panini', 'Stephen Curry', 'sports', 'Panini Select', 'rare'),
  c('spt-trout-bowman', 'Mike Trout Rookie', 'sports', '2011 Bowman Chrome', 'ultra-rare'),
  c('spt-ohtani-topps', 'Shohei Ohtani', 'sports', 'Topps Update', 'rare'),
  c('spt-mahomes-panini', 'Patrick Mahomes', 'sports', 'Panini Prizm', 'holo-rare'),
  c('spt-griffey-upperdeck', 'Ken Griffey Jr. Rookie', 'sports', '1989 Upper Deck', 'rare'),
  c('spt-jeter-topps', 'Derek Jeter Rookie', 'sports', '1993 Topps', 'rare'),
  c('spt-wembanyama-panini', 'Victor Wembanyama Rookie', 'sports', 'Panini Prizm', 'ultra-rare'),
  c('spt-ronaldo-panini', 'Cristiano Ronaldo', 'sports', 'Panini Obsidian', 'holo-rare'),
  c('spt-caitlin-clark', 'Caitlin Clark Rookie', 'sports', 'Panini Prizm', 'ultra-rare'),
]

export const cardById = (id) => CARDS.find((card) => card.id === id)

export function searchCards(query, gameFilter) {
  const q = query.trim().toLowerCase()
  return CARDS.filter((card) => {
    if (gameFilter && gameFilter !== 'all' && card.game !== gameFilter) return false
    if (!q) return true
    return (
      card.name.toLowerCase().includes(q) ||
      card.set.toLowerCase().includes(q)
    )
  })
}
