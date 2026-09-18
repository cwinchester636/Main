import type { ItemId } from "./items";

export interface ShopListing {
  item: ItemId;
  price: number;
}

export interface ShopDef {
  id: string;
  name: string;
  /** Items the player can buy from this shop. */
  sells: ShopListing[];
  /** Items this shop will buy from the player. */
  buys: ShopListing[];
}

export const SHOPS: Record<string, ShopDef> = {
  generalStore: {
    id: "generalStore",
    name: "General Store",
    sells: [{ item: "cookedFish", price: 8 }],
    buys: [
      { item: "copperOre", price: 3 },
      { item: "log", price: 3 },
      { item: "rawFish", price: 3 },
      { item: "plank", price: 4 },
      { item: "copperBar", price: 5 },
    ],
  },
  blacksmith: {
    id: "blacksmith",
    name: "Blacksmith",
    sells: [
      { item: "sword", price: 60 },
      { item: "leatherArmor", price: 50 },
      { item: "pickaxeUpgrade", price: 45 },
    ],
    buys: [
      { item: "copperOre", price: 4 },
      { item: "copperBar", price: 7 },
    ],
  },
  carpenter: {
    id: "carpenter",
    name: "Carpenter",
    sells: [{ item: "axeUpgrade", price: 45 }],
    buys: [
      { item: "log", price: 4 },
      { item: "plank", price: 6 },
    ],
  },
  magicShop: {
    id: "magicShop",
    name: "Magic Shop",
    sells: [{ item: "luckyCharm", price: 90 }],
    buys: [],
  },
};
