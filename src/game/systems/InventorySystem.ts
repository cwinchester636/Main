import Phaser from "phaser";
import type { ItemId } from "../data/items";

export interface InventoryChangeEvent {
  itemId: ItemId;
  quantity: number;
  delta: number;
}

/** Simple stack-count inventory: itemId -> quantity owned. */
export class InventorySystem extends Phaser.Events.EventEmitter {
  private items: Partial<Record<ItemId, number>>;

  constructor(initial?: Partial<Record<ItemId, number>>) {
    super();
    this.items = { ...initial };
  }

  getQuantity(id: ItemId): number {
    return this.items[id] ?? 0;
  }

  getAll(): Readonly<Partial<Record<ItemId, number>>> {
    return this.items;
  }

  add(id: ItemId, amount: number): void {
    if (amount <= 0) return;
    this.items[id] = (this.items[id] ?? 0) + amount;
    this.emit("change", {
      itemId: id,
      quantity: this.items[id],
      delta: amount,
    } satisfies InventoryChangeEvent);
  }

  has(id: ItemId, amount: number): boolean {
    return this.getQuantity(id) >= amount;
  }

  hasAll(costs: Partial<Record<ItemId, number>>): boolean {
    return Object.entries(costs).every(([id, qty]) =>
      this.has(id as ItemId, qty ?? 0),
    );
  }

  remove(id: ItemId, amount: number): boolean {
    if (!this.has(id, amount)) return false;
    this.items[id] = (this.items[id] ?? 0) - amount;
    this.emit("change", {
      itemId: id,
      quantity: this.items[id],
      delta: -amount,
    } satisfies InventoryChangeEvent);
    return true;
  }

  removeAll(costs: Partial<Record<ItemId, number>>): boolean {
    if (!this.hasAll(costs)) return false;
    for (const [id, qty] of Object.entries(costs)) {
      this.remove(id as ItemId, qty ?? 0);
    }
    return true;
  }

  serialize(): Partial<Record<ItemId, number>> {
    return { ...this.items };
  }
}
