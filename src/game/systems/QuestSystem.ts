import Phaser from "phaser";
import { QUESTS } from "../data/quests";
import type { InventorySystem } from "./InventorySystem";
import type { EconomySystem } from "./EconomySystem";
import type { SkillSystem } from "./SkillSystem";

export type QuestState = "available" | "completed";

export interface QuestTurnInEvent {
  questId: string;
  gold: number;
  xp: number;
}

/** Tracks the small set of fetch-quests NPCs offer; each is available once. */
export class QuestSystem extends Phaser.Events.EventEmitter {
  private state: Record<string, QuestState>;

  constructor(completedIds?: string[]) {
    super();
    this.state = {};
    for (const quest of QUESTS) {
      this.state[quest.id] = completedIds?.includes(quest.id) ? "completed" : "available";
    }
  }

  getState(questId: string): QuestState {
    return this.state[questId] ?? "available";
  }

  /** Whether the player currently holds enough of the required item. */
  canTurnIn(questId: string, inventory: InventorySystem): boolean {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest || this.state[questId] !== "available") return false;
    return inventory.has(quest.requirement.item, quest.requirement.quantity);
  }

  turnIn(
    questId: string,
    inventory: InventorySystem,
    economy: EconomySystem,
    skills: SkillSystem,
  ): boolean {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest || !this.canTurnIn(questId, inventory)) return false;

    inventory.remove(quest.requirement.item, quest.requirement.quantity);
    economy.add(quest.reward.gold);
    skills.addXp(quest.reward.skill, quest.reward.xp);
    this.state[questId] = "completed";
    this.emit("turnedIn", {
      questId,
      gold: quest.reward.gold,
      xp: quest.reward.xp,
    } satisfies QuestTurnInEvent);
    return true;
  }

  serialize(): string[] {
    return Object.entries(this.state)
      .filter(([, s]) => s === "completed")
      .map(([id]) => id);
  }
}
