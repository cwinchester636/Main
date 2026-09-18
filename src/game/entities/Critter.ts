import Phaser from "phaser";

export type CritterKind = "butterfly" | "rabbit";

/** Purely decorative wildlife that idles and wanders near its spawn point. No physics, no interaction. */
export class Critter extends Phaser.GameObjects.Sprite {
  private readonly homeX: number;
  private readonly homeY: number;
  private readonly roamRadius: number;
  private readonly kind: CritterKind;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: CritterKind, variant = 0) {
    super(scene, x, y, kind === "butterfly" ? `butterfly-${variant}-open` : "rabbit-idle");
    this.kind = kind;
    this.homeX = x;
    this.homeY = y;
    this.roamRadius = kind === "butterfly" ? 70 : 45;
    scene.add.existing(this);
    this.setDepth(kind === "butterfly" ? 2 : 0.8);

    if (kind === "butterfly") this.play(`butterfly-flutter-${variant}`);

    this.scheduleNextMove(Phaser.Math.Between(200, 2000));
  }

  private scheduleNextMove(delay: number): void {
    this.scene.time.delayedCall(delay, () => this.moveToRandomPoint());
  }

  private moveToRandomPoint(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(15, this.roamRadius);
    const tx = Phaser.Math.Clamp(this.homeX + Math.cos(angle) * dist, 20, 100000);
    const ty = Phaser.Math.Clamp(this.homeY + Math.sin(angle) * dist, 20, 100000);
    this.setFlipX(tx < this.x);

    if (this.kind === "butterfly") {
      this.scene.tweens.add({
        targets: this,
        x: tx,
        y: ty,
        duration: Phaser.Math.Between(1800, 3200),
        ease: "Sine.InOut",
        onComplete: () => this.scheduleNextMove(Phaser.Math.Between(300, 1500)),
      });
    } else {
      this.play("rabbit-hop");
      this.scene.tweens.add({
        targets: this,
        x: tx,
        y: ty,
        duration: 220,
        ease: "Quad.Out",
        onComplete: () => {
          this.play("rabbit-idle");
          this.scheduleNextMove(Phaser.Math.Between(1500, 4500));
        },
      });
    }
  }
}
