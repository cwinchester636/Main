import type { ItemId } from "./items";
import type { SkillId } from "./skills";

export interface QuestDef {
  id: string;
  giverNpcId: string;
  title: string;
  description: string;
  requirement: { item: ItemId; quantity: number };
  reward: { gold: number; xp: number; skill: SkillId };
}

export const QUESTS: QuestDef[] = [
  {
    id: "carpenterLogs",
    giverNpcId: "carpenter",
    title: "Lumber Order",
    description: "The carpenter needs 5 Logs for a big order. Bring them by for gold and experience.",
    requirement: { item: "log", quantity: 5 },
    reward: { gold: 20, xp: 25, skill: "woodcutting" },
  },
  {
    id: "blacksmithOre",
    giverNpcId: "blacksmith",
    title: "Ore Shortage",
    description: "The forge is running low on copper. Bring 5 Copper Ore to keep it burning.",
    requirement: { item: "copperOre", quantity: 5 },
    reward: { gold: 20, xp: 25, skill: "mining" },
  },
  {
    id: "harborFish",
    giverNpcId: "harborMaster",
    title: "Fresh Catch",
    description: "The harbor master wants 5 Raw Fish to feed the dock workers.",
    requirement: { item: "rawFish", quantity: 5 },
    reward: { gold: 20, xp: 25, skill: "fishing" },
  },
];
