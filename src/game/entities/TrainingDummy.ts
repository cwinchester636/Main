import Phaser from "phaser";

const MAX_HP = 30;
const XP_PER_HIT = 4;
const ATTACK_COOLDOWN_MS = 500;
const RESPAWN_DELAY_MS = 4000;

/** A simple combat target: attack it repeatedly for Combat XP. */
export class TrainingDummy extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBarFill: Phaser.GameObjects.Rectangle;
  private hp = MAX_HP;
  private cooldownRemaining = 0;
  private defeated = false;
  private respawnRemaining = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.sprite = scene.add.sprite(0, 0, "dummy");
    this.add(this.sprite);

    this.hpBarBg = scene.add.rectangle(0, -30, 32, 5, 0x000000, 0.5);
    this.hpBarFill = scene.add
      .rectangle(-16, -30, 32, 5, 0xe04b4b)
      .setOrigin(0, 0.5);
    this.add([this.hpBarBg, this.hpBarFill]);

    scene.physics.add.existing(this, true);
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.x, this.y, x, y);
  }

  isDefeated(): boolean {
    return this.defeated;
  }

  canAttack(): boolean {
    return !this.defeated && this.cooldownRemaining <= 0;
  }

  /** Land one hit for `damage`; returns XP earned, or null if the attack couldn't land. */
  attack(damage: number): number | null {
    if (!this.canAttack()) return null;
    this.cooldownRemaining = ATTACK_COOLDOWN_MS;
    this.hp = Math.max(0, this.hp - damage);
    this.hpBarFill.width = 32 * (this.hp / MAX_HP);

    this.sprite.setTint(0xff9999);
    this.scene.time.delayedCall(100, () => this.sprite.clearTint());
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + 4,
      duration: 60,
      yoyo: true,
    });

    if (this.hp <= 0) {
      this.defeat();
    }

    return XP_PER_HIT;
  }

  update(deltaMs: number): void {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining -= deltaMs;
    }
    if (this.defeated) {
      this.respawnRemaining -= deltaMs;
      if (this.respawnRemaining <= 0) {
        this.respawn();
      }
    }
  }

  private defeat(): void {
    this.defeated = true;
    this.respawnRemaining = RESPAWN_DELAY_MS;
    this.sprite.setAlpha(0.25);
    this.hpBarBg.setVisible(false);
    this.hpBarFill.setVisible(false);
  }

  private respawn(): void {
    this.defeated = false;
    this.hp = MAX_HP;
    this.sprite.setAlpha(1);
    this.hpBarFill.width = 32;
    this.hpBarBg.setVisible(true);
    this.hpBarFill.setVisible(true);
    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.5, to: 1 },
      duration: 250,
      ease: "Back.Out",
    });
  }
}
