import Phaser from "phaser";
import {
  ALL_SKILL_IDS,
  MAX_LEVEL,
  type SkillId,
  levelForXp,
  xpForLevel,
} from "../data/skills";

export interface SkillState {
  xp: number;
  level: number;
}

export interface SkillGainEvent {
  skillId: SkillId;
  amount: number;
  totalXp: number;
  level: number;
}

export interface SkillLevelUpEvent {
  skillId: SkillId;
  newLevel: number;
  previousLevel: number;
}

/**
 * Central store of every skill's XP/level, independent from any single
 * scene so both the world (GameScene) and the HUD (UIScene) can read and
 * react to the same source of truth via events.
 */
export class SkillSystem extends Phaser.Events.EventEmitter {
  private skills: Record<SkillId, SkillState>;

  constructor(initial?: Partial<Record<SkillId, SkillState>>) {
    super();
    this.skills = {} as Record<SkillId, SkillState>;
    for (const id of ALL_SKILL_IDS) {
      const saved = initial?.[id];
      const xp = saved?.xp ?? 0;
      this.skills[id] = { xp, level: levelForXp(xp) };
    }
  }

  getLevel(id: SkillId): number {
    return this.skills[id].level;
  }

  getXp(id: SkillId): number {
    return this.skills[id].xp;
  }

  getState(id: SkillId): Readonly<SkillState> {
    return this.skills[id];
  }

  getAllStates(): Readonly<Record<SkillId, SkillState>> {
    return this.skills;
  }

  /** Total level across all skills — a simple overall "character power" figure. */
  getTotalLevel(): number {
    return ALL_SKILL_IDS.reduce((sum, id) => sum + this.skills[id].level, 0);
  }

  /** Progress toward the next level, 0..1. Always 1 at max level. */
  getProgress(id: SkillId): number {
    const state = this.skills[id];
    if (state.level >= MAX_LEVEL) return 1;
    const currentFloor = xpForLevel(state.level);
    const nextCeil = xpForLevel(state.level + 1);
    return (state.xp - currentFloor) / (nextCeil - currentFloor);
  }

  addXp(id: SkillId, amount: number): void {
    if (amount <= 0) return;
    const state = this.skills[id];
    const previousLevel = state.level;
    state.xp += amount;
    state.level = levelForXp(state.xp);

    this.emit("xpGained", {
      skillId: id,
      amount,
      totalXp: state.xp,
      level: state.level,
    } satisfies SkillGainEvent);

    if (state.level > previousLevel) {
      this.emit("levelUp", {
        skillId: id,
        newLevel: state.level,
        previousLevel,
      } satisfies SkillLevelUpEvent);
    }
  }

  serialize(): Record<SkillId, SkillState> {
    return JSON.parse(JSON.stringify(this.skills));
  }
}
