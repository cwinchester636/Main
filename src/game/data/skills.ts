export type SkillId =
  | "mining"
  | "woodcutting"
  | "fishing"
  | "combat"
  | "crafting"
  | "cooking";

export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  /** Hex color used for this skill's UI accents (progress bars, icons). */
  color: number;
}

export const SKILL_DEFINITIONS: Record<SkillId, SkillDefinition> = {
  mining: {
    id: "mining",
    name: "Mining",
    description: "Swing a pickaxe at ore veins to gather raw metal.",
    color: 0x8d8d99,
  },
  woodcutting: {
    id: "woodcutting",
    name: "Woodcutting",
    description: "Chop trees for logs used in crafting.",
    color: 0x5c8a3a,
  },
  fishing: {
    id: "fishing",
    name: "Fishing",
    description: "Catch fish from shorelines to cook and eat.",
    color: 0x3a7ca5,
  },
  combat: {
    id: "combat",
    name: "Combat",
    description: "Fight enemies to grow stronger in battle.",
    color: 0xb33a3a,
  },
  crafting: {
    id: "crafting",
    name: "Crafting",
    description: "Turn raw materials into tools and equipment.",
    color: 0xa5763a,
  },
  cooking: {
    id: "cooking",
    name: "Cooking",
    description: "Prepare raw fish and meat into food that heals.",
    color: 0xd9a441,
  },
};

export const ALL_SKILL_IDS = Object.keys(SKILL_DEFINITIONS) as SkillId[];

export const MAX_LEVEL = 50;

/**
 * XP required to REACH each level, index 0 is unused (level 0 doesn't exist).
 * Classic RPG-style curve: each level costs progressively more, roughly
 * scaling like level^2.2 so early levels are fast and late levels are a grind.
 */
export const XP_TABLE: number[] = (() => {
  const table = [0, 0];
  for (let level = 2; level <= MAX_LEVEL; level++) {
    const xp = Math.floor(table[level - 1] + 15 * Math.pow(level - 1, 2.2));
    table.push(xp);
  }
  return table;
})();

export function xpForLevel(level: number): number {
  return XP_TABLE[Math.min(Math.max(level, 1), MAX_LEVEL)];
}

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 2; i <= MAX_LEVEL; i++) {
    if (xp >= XP_TABLE[i]) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}
