import Phaser from "phaser";

export type Facing = "up" | "down" | "left" | "right";

const SPEED = 180;

/** Top-down 4-direction player controller built on Arcade Physics. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private facing: Facing = "down";
  private shadow: Phaser.GameObjects.Image;
  private idleBob = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player-down-0");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(1);

    this.shadow = scene.add.image(x, y + 17, "player-shadow").setDepth(0.5);

    this.setCollideWorldBounds(true);
    this.setSize(18, 10).setOffset(7, 29);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.play("idle-down");
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

  /**
   * @param touchVector Analog direction from an on-screen joystick, magnitude
   *   0..1. When it has any length it overrides keyboard input for this frame.
   */
  update(delta: number, touchVector?: Phaser.Math.Vector2): void {
    let dirX: number;
    let dirY: number;
    let velocity: Phaser.Math.Vector2;

    if (touchVector && touchVector.lengthSq() > 0.0001) {
      dirX = touchVector.x;
      dirY = touchVector.y;
      velocity = touchVector.clone().scale(SPEED);
    } else {
      const left = this.cursors.left.isDown || this.wasd.left.isDown;
      const right = this.cursors.right.isDown || this.wasd.right.isDown;
      const up = this.cursors.up.isDown || this.wasd.up.isDown;
      const down = this.cursors.down.isDown || this.wasd.down.isDown;

      dirX = (right ? 1 : 0) - (left ? 1 : 0);
      dirY = (down ? 1 : 0) - (up ? 1 : 0);
      velocity = new Phaser.Math.Vector2(dirX, dirY);
      if (dirX !== 0 || dirY !== 0) velocity.normalize().scale(SPEED);
    }

    const moving = dirX !== 0 || dirY !== 0;
    this.setVelocity(velocity.x, velocity.y);

    if (moving) {
      if (Math.abs(dirX) > Math.abs(dirY)) {
        this.facing = dirX > 0 ? "right" : "left";
      } else {
        this.facing = dirY > 0 ? "down" : "up";
      }
      this.play(`walk-${this.facing}`, true);
      this.idleBob = 0;
      this.setScale(1, 1);
    } else {
      this.play(`idle-${this.facing}`, true);
      // Gentle idle "breathing" so the character never looks frozen.
      this.idleBob += delta * 0.004;
      this.setScale(1, 1 + Math.sin(this.idleBob) * 0.015);
    }

    this.shadow.setPosition(this.x, this.y + 17);
    this.shadow.setScale(moving ? 0.9 : 1);
  }

  isMoving(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.velocity.lengthSq() > 0;
  }
}
