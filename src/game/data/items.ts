export type ItemId =
  | "copperOre"
  | "copperBar"
  | "log"
  | "plank"
  | "rawFish"
  | "cookedFish"
  | "pickaxeUpgrade"
  | "axeUpgrade";

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  color: number;
  stackable: boolean;
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
  },
  axeUpgrade: {
    id: "axeUpgrade",
    name: "Sturdy Axe",
    description: "A crafted upgrade that speeds up woodcutting.",
    color: 0x777777,
    stackable: false,
  },
};
