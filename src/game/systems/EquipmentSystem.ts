import Phaser from "phaser";
import { ITEM_DEFINITIONS, type EquipSlot, type ItemId } from "../data/items";
import type { InventorySystem } from "./InventorySystem";

export interface DerivedStats {
  attack: number;
  defense: number;
  /** Percent bonus applied to gathering XP (from a tool). */
  gatherXpBonusPct: number;
  /** Percent bonus applied to all XP gains (from an accessory). */
  allXpBonusPct: number;
}

const BASE_ATTACK = 4;
const BASE_DEFENSE = 0;

/** Equipped gear (one item per slot); derives combat/gathering stat bonuses. */
export class EquipmentSystem extends Phaser.Events.EventEmitter {
  private slots: Partial<Record<EquipSlot, ItemId>>;

  constructor(initial?: Partial<Record<EquipSlot, ItemId>>) {
    super();
    this.slots = { ...initial };
  }

  getEquipped(slot: EquipSlot): ItemId | undefined {
    return this.slots[slot];
  }

  getAllEquipped(): Readonly<Partial<Record<EquipSlot, ItemId>>> {
    return this.slots;
  }

  /** Moves one unit of `itemId` from inventory into its slot, returning any previously equipped item to inventory. */
  equip(itemId: ItemId, inventory: InventorySystem): boolean {
    const def = ITEM_DEFINITIONS[itemId];
    if (!def.equip) return false;
    if (!inventory.remove(itemId, 1)) return false;

    const slot = def.equip.slot;
    const previous = this.slots[slot];
    if (previous) inventory.add(previous, 1);

    this.slots[slot] = itemId;
    this.emit("change");
    return true;
  }

  unequip(slot: EquipSlot, inventory: InventorySystem): boolean {
    const current = this.slots[slot];
    if (!current) return false;
    delete this.slots[slot];
    inventory.add(current, 1);
    this.emit("change");
    return true;
  }

  getStats(): DerivedStats {
    let attack = BASE_ATTACK;
    let defense = BASE_DEFENSE;
    let gatherXpBonusPct = 0;
    let allXpBonusPct = 0;

    for (const itemId of Object.values(this.slots)) {
      const equip = ITEM_DEFINITIONS[itemId as ItemId].equip;
      if (!equip) continue;
      attack += equip.attackBonus ?? 0;
      defense += equip.defenseBonus ?? 0;
      if (equip.slot === "tool") gatherXpBonusPct += equip.xpBonusPct ?? 0;
      if (equip.slot === "accessory") allXpBonusPct += equip.xpBonusPct ?? 0;
    }

    return { attack, defense, gatherXpBonusPct, allXpBonusPct };
  }

  serialize(): Partial<Record<EquipSlot, ItemId>> {
    return { ...this.slots };
  }
}
