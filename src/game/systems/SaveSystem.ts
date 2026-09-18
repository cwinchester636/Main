import type { EquipSlot, ItemId } from "../data/items";
import type { SkillId } from "../data/skills";
import type { SkillState } from "./SkillSystem";

const SAVE_KEY = "skillquest-save-v1";

export interface SaveData {
  skills: Record<SkillId, SkillState>;
  inventory: Partial<Record<ItemId, number>>;
  playerX: number;
  playerY: number;
  gold?: number;
  equipment?: Partial<Record<EquipSlot, ItemId>>;
  completedQuests?: string[];
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private browsing, quota) — progress just won't persist.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
