import Phaser from "phaser";

/** A single gold wallet shared by shops and quest rewards. */
export class EconomySystem extends Phaser.Events.EventEmitter {
  private gold: number;

  constructor(initialGold = 0) {
    super();
    this.gold = initialGold;
  }

  getGold(): number {
    return this.gold;
  }

  canAfford(amount: number): boolean {
    return this.gold >= amount;
  }

  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.gold -= amount;
    this.emit("change", this.gold);
    return true;
  }

  add(amount: number): void {
    if (amount <= 0) return;
    this.gold += amount;
    this.emit("change", this.gold);
  }

  serialize(): number {
    return this.gold;
  }
}
