import Phaser from "phaser";

export interface NpcConfig {
  id: string;
  name: string;
  textureKey: string;
  shopId?: string;
  questId?: string;
  /** Ambient villagers with no shop/quest wander a little; functional NPCs stand still. */
  wander?: boolean;
}

/** A stationary or gently-wandering villager. Shopkeepers/quest-givers are solid; ambient wanderers are not. */
export class Npc extends Phaser.GameObjects.Container {
  readonly config: NpcConfig;
  private questMarker: Phaser.GameObjects.Text;
  private homeX: number;
  private homeY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: NpcConfig) {
    super(scene, x, y);
    this.config = config;
    this.homeX = x;
    this.homeY = y;
    scene.add.existing(this);

    const sprite = scene.add.sprite(0, 0, config.textureKey);
    const nameText = scene.add
      .text(0, 16, config.name, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffffff",
        backgroundColor: "#00000066",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 0);
    this.questMarker = scene.add
      .text(0, -30, "!", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffe066",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.add([sprite, nameText, this.questMarker]);
    this.setDepth(1);

    const isFunctional = !!(config.shopId || config.questId);
    if (isFunctional) {
      scene.physics.add.existing(this, true);
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      const w = 18;
      const h = 12;
      body.position.x = x - w / 2;
      body.position.y = y + 8 - h / 2;
      body.setSize(w, h, false);
    } else if (config.wander) {
      this.scheduleWander();
    }
  }

  setQuestMarkerVisible(visible: boolean): void {
    this.questMarker.setVisible(visible);
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.x, this.y, x, y);
  }

  private scheduleWander(): void {
    this.scene.time.delayedCall(Phaser.Math.Between(2000, 5000), () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(15, 40);
      this.scene.tweens.add({
        targets: this,
        x: this.homeX + Math.cos(angle) * dist,
        y: this.homeY + Math.sin(angle) * dist,
        duration: 1500,
        ease: "Sine.InOut",
        onComplete: () => this.scheduleWander(),
      });
    });
  }
}
