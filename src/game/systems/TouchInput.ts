import Phaser from "phaser";

/**
 * Shared touch-input state: a joystick-driven movement vector (magnitude
 * 0..1) and a one-shot "interact" press, written by the on-screen controls
 * in UIScene and read by GameScene each frame — the same shape keyboard
 * input already produces, so Player/GameScene don't care which drove it.
 */
export class TouchInput {
  readonly moveVector = new Phaser.Math.Vector2(0, 0);
  private interactPressed = false;

  setMove(x: number, y: number): void {
    this.moveVector.set(x, y);
  }

  clearMove(): void {
    this.moveVector.set(0, 0);
  }

  pressInteract(): void {
    this.interactPressed = true;
  }

  /** Reads and clears the pending interact press, mirroring Keyboard.JustDown. */
  consumeInteract(): boolean {
    if (this.interactPressed) {
      this.interactPressed = false;
      return true;
    }
    return false;
  }
}
