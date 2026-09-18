import type { ItemId } from "./items";
import type { SkillId } from "./skills";

export interface Recipe {
  id: string;
  name: string;
  skill: SkillId;
  levelRequired: number;
  inputs: Partial<Record<ItemId, number>>;
  output: { item: ItemId; quantity: number };
  xp: number;
}

export const RECIPES: Recipe[] = [
  {
    id: "smeltCopperBar",
    name: "Smelt Copper Bar",
    skill: "crafting",
    levelRequired: 1,
    inputs: { copperOre: 2 },
    output: { item: "copperBar", quantity: 1 },
    xp: 8,
  },
  {
    id: "cutPlank",
    name: "Cut Plank",
    skill: "crafting",
    levelRequired: 1,
    inputs: { log: 2 },
    output: { item: "plank", quantity: 1 },
    xp: 6,
  },
  {
    id: "craftPickaxeUpgrade",
    name: "Craft Sturdy Pickaxe",
    skill: "crafting",
    levelRequired: 5,
    inputs: { copperBar: 5, plank: 3 },
    output: { item: "pickaxeUpgrade", quantity: 1 },
    xp: 40,
  },
  {
    id: "craftAxeUpgrade",
    name: "Craft Sturdy Axe",
    skill: "crafting",
    levelRequired: 5,
    inputs: { copperBar: 5, plank: 3 },
    output: { item: "axeUpgrade", quantity: 1 },
    xp: 40,
  },
  {
    id: "cookFish",
    name: "Cook Fish",
    skill: "cooking",
    levelRequired: 1,
    inputs: { rawFish: 1 },
    output: { item: "cookedFish", quantity: 1 },
    xp: 5,
  },
];
