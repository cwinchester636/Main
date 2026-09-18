import Phaser from "phaser";
import type { ItemId } from "../data/items";
import type { SkillId } from "../data/skills";

export interface ResourceNodeConfig {
  textureKey: string;
  depletedTextureKey: string;
  skill: SkillId;
  item: ItemId;
  xpPerAction: number;
  itemsPerAction: number;
  maxCharges: number;
  actionDurationMs: number;
  respawnDelayMs: number;
  interactionRadius: number;
  label: string;
  /** Physical footprint that blocks the player while the node isn't depleted. Omit for a walk-through node. */
  collisionSize?: { width: number; height: number };
}

/** A gatherable world object (tree, ore vein, fishing spot, ...). */
export class ResourceNode extends Phaser.GameObjects.Container {
  readonly config: ResourceNodeConfig;
  private sprite: Phaser.GameObjects.Sprite;
  private progressBarBg: Phaser.GameObjects.Rectangle;
  private progressBarFill: Phaser.GameObjects.Rectangle;
  private charges: number;
  private depleted = false;
  private actionProgressMs = 0;
  private respawnRemainingMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: ResourceNodeConfig) {
    super(scene, x, y);
    this.config = config;
    this.charges = config.maxCharges;
    scene.add.existing(this);

    this.sprite = scene.add.sprite(0, 0, config.textureKey);
    this.add(this.sprite);

    this.progressBarBg = scene.add
      .rectangle(0, -28, 28, 5, 0x000000, 0.5)
      .setVisible(false);
    this.progressBarFill = scene.add
      .rectangle(-14, -28, 0, 5, 0xffe066)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.add([this.progressBarBg, this.progressBarFill]);

    scene.physics.add.existing(this, true);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    if (config.collisionSize) {
      const { width, height } = config.collisionSize;
      // StaticBody.setSize() normally re-centers itself on the game object
      // via gameObject.getCenter(), but Container has no getCenter(), so
      // that step silently no-ops and leaves the body positioned from its
      // stale default (64x64) size. Position it ourselves first, then size
      // it with centering disabled so it isn't clobbered.
      body.position.x = x - width / 2;
      body.position.y = y - height / 2;
      body.setSize(width, height, false);
    } else {
      body.enable = false;
    }
  }

  /** Whether this node has a solid footprint at all (independent of depleted state). */
  isSolid(): boolean {
    return !!this.config.collisionSize;
  }

  isDepleted(): boolean {
    return this.depleted;
  }

  isBusy(): boolean {
    return this.actionProgressMs > 0;
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.x, this.y, x, y);
  }

  /** Begin one gather/attack action; returns false if not possible right now. */
  tryStartAction(): boolean {
    if (this.depleted || this.isBusy()) return false;
    this.actionProgressMs = 1;
    this.progressBarBg.setVisible(true);
    this.progressBarFill.setVisible(true);
    return true;
  }

  /** Advance timers; returns a completed action result once per finished action. */
  update(deltaMs: number): { xp: number; item: ItemId; quantity: number } | null {
    if (this.depleted) {
      this.respawnRemainingMs -= deltaMs;
      if (this.respawnRemainingMs <= 0) {
        this.respawn();
      }
      return null;
    }

    if (this.actionProgressMs > 0) {
      this.actionProgressMs += deltaMs;
      const t = Phaser.Math.Clamp(this.actionProgressMs / this.config.actionDurationMs, 0, 1);
      this.progressBarFill.width = 28 * t;

      if (this.actionProgressMs >= this.config.actionDurationMs) {
        this.actionProgressMs = 0;
        this.progressBarBg.setVisible(false);
        this.progressBarFill.setVisible(false);
        this.charges -= 1;

        this.sprite.setTint(0xffffff);
        this.scene.tweens.add({
          targets: this.sprite,
          scale: { from: 1.15, to: 1 },
          duration: 150,
        });

        if (this.charges <= 0) {
          this.deplete();
        }

        return {
          xp: this.config.xpPerAction,
          item: this.config.item,
          quantity: this.config.itemsPerAction,
        };
      }
    }

    return null;
  }

  private deplete(): void {
    this.depleted = true;
    this.respawnRemainingMs = this.config.respawnDelayMs;
    this.sprite.setTexture(this.config.depletedTextureKey);
    if (this.config.collisionSize) {
      (this.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    }
  }

  private respawn(): void {
    this.depleted = false;
    this.charges = this.config.maxCharges;
    this.sprite.setTexture(this.config.textureKey);
    if (this.config.collisionSize) {
      (this.body as Phaser.Physics.Arcade.StaticBody).enable = true;
    }
    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.5, to: 1 },
      duration: 250,
      ease: "Back.Out",
    });
  }
}
