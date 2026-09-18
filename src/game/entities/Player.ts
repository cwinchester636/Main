import Phaser from "phaser";

export type Facing = "up" | "down" | "left" | "right";

const SPEED = 180;

/** Top-down 4-direction player controller built on Arcade Physics. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private facing: Facing = "down";
  private bob = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player-down");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setSize(20, 16).setOffset(6, 20);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  getFacing(): Facing {
    return this.facing;
  }

  /** Position in front of the player, used for interaction range checks. */
  getFacingPoint(distance = 24): Phaser.Math.Vector2 {
    const p = new Phaser.Math.Vector2(this.x, this.y);
    switch (this.facing) {
      case "up":
        p.y -= distance;
        break;
      case "down":
        p.y += distance;
        break;
      case "left":
        p.x -= distance;
        break;
      case "right":
        p.x += distance;
        break;
    }
    return p;
  }

  update(delta: number): void {
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    const vx = (right ? 1 : 0) - (left ? 1 : 0);
    const vy = (down ? 1 : 0) - (up ? 1 : 0);
    const moving = vx !== 0 || vy !== 0;

    const velocity = new Phaser.Math.Vector2(vx, vy);
    if (moving) velocity.normalize().scale(SPEED);
    this.setVelocity(velocity.x, velocity.y);

    if (moving) {
      if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = vx > 0 ? "right" : "left";
      } else {
        this.facing = vy > 0 ? "down" : "up";
      }
      this.setTexture(`player-${this.facing}`);

      this.bob += delta * 0.02;
      this.setScale(1, 1 + Math.sin(this.bob) * 0.04);
    } else {
      this.bob = 0;
      this.setScale(1, 1);
    }
  }

  isMoving(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.velocity.lengthSq() > 0;
  }
}
