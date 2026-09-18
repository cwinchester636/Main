export type ItemId =
  | "copperOre"
  | "copperBar"
  | "log"
  | "plank"
  | "rawFish"
  | "cookedFish"
  | "pickaxeUpgrade"
  | "axeUpgrade"
  | "sword"
  | "leatherArmor"
  | "luckyCharm";

export type EquipSlot = "weapon" | "armor" | "accessory" | "tool";

export interface EquipStats {
  slot: EquipSlot;
  /** Flat bonus to combat damage dealt. */
  attackBonus?: number;
  /** Flat bonus to (currently cosmetic) defense. */
  defenseBonus?: number;
  /** Percent bonus to XP earned: tool applies to gathering, accessory to everything. */
  xpBonusPct?: number;
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  color: number;
  stackable: boolean;
  equip?: EquipStats;
}

export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  copperOre: {
    id: "copperOre",
    name: "Copper Ore",
    description: "Raw ore fresh from the rock.",
    color: 0xb87333,
    stackable: true,
  },
  copperBar: {
    id: "copperBar",
    name: "Copper Bar",
    description: "Smelted ore, ready for crafting.",
    color: 0xd99a5b,
    stackable: true,
  },
  log: {
    id: "log",
    name: "Log",
    description: "A sturdy log chopped from a tree.",
    color: 0x6b4423,
    stackable: true,
  },
  plank: {
    id: "plank",
    name: "Plank",
    description: "A log cut down into a usable plank.",
    color: 0xc19a6b,
    stackable: true,
  },
  rawFish: {
    id: "rawFish",
    name: "Raw Fish",
    description: "Best cooked before eating.",
    color: 0x6699cc,
    stackable: true,
  },
  cookedFish: {
    id: "cookedFish",
    name: "Cooked Fish",
    description: "Restores health when eaten.",
    color: 0xe0975c,
    stackable: true,
  },
  pickaxeUpgrade: {
    id: "pickaxeUpgrade",
    name: "Sturdy Pickaxe",
    description: "A crafted upgrade that speeds up mining.",
    color: 0x999999,
    stackable: false,
    equip: { slot: "tool", xpBonusPct: 5 },
  },
  axeUpgrade: {
    id: "axeUpgrade",
    name: "Sturdy Axe",
    description: "A crafted upgrade that speeds up woodcutting.",
    color: 0x777777,
    stackable: false,
    equip: { slot: "tool", xpBonusPct: 5 },
  },
  sword: {
    id: "sword",
    name: "Sword",
    description: "A well-balanced blade from the blacksmith.",
    color: 0xd8d8e4,
    stackable: false,
    equip: { slot: "weapon", attackBonus: 4 },
  },
  leatherArmor: {
    id: "leatherArmor",
    name: "Leather Armor",
    description: "Sturdy tanned hide, stitched by the blacksmith.",
    color: 0x8a6a4a,
    stackable: false,
    equip: { slot: "armor", defenseBonus: 3 },
  },
  luckyCharm: {
    id: "luckyCharm",
    name: "Lucky Charm",
    description: "A magic trinket that speeds up learning.",
    color: 0xc86ce8,
    stackable: false,
    equip: { slot: "accessory", xpBonusPct: 10 },
  },
};
