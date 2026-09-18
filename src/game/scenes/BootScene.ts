import Phaser from "phaser";

/**
 * Generates every sprite as a small procedural texture via Graphics so the
 * game is fully playable with zero external art assets. Swap these calls
 * out for `this.load.image(...)` once real art exists.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    this.makePlayerTextures();
    this.makeTreeTextures();
    this.makeRockTextures();
    this.makeFishingSpotTextures();
    this.makeDummyTexture();
    this.makeStationTextures();
    this.makeGroundTextures();

    this.scene.start("Game");
    this.scene.launch("UI");
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  private makePlayerTextures(): void {
    const body = 0x3a6ea5;
    const skin = 0xe8b98a;
    const dirs: Record<string, () => void> = {
      down: () => {
        const g = this.g();
        g.fillStyle(body, 1).fillRoundedRect(6, 14, 20, 22, 4);
        g.fillStyle(skin, 1).fillCircle(16, 10, 9);
        g.fillStyle(0x222222, 1).fillCircle(12, 9, 1.6).fillCircle(20, 9, 1.6);
        g.generateTexture("player-down", 32, 40);
        g.destroy();
      },
      up: () => {
        const g = this.g();
        g.fillStyle(body, 1).fillRoundedRect(6, 14, 20, 22, 4);
        g.fillStyle(skin, 1).fillCircle(16, 10, 9);
        g.generateTexture("player-up", 32, 40);
        g.destroy();
      },
      left: () => {
        const g = this.g();
        g.fillStyle(body, 1).fillRoundedRect(6, 14, 20, 22, 4);
        g.fillStyle(skin, 1).fillCircle(14, 10, 9);
        g.fillStyle(0x222222, 1).fillCircle(11, 9, 1.6);
        g.generateTexture("player-left", 32, 40);
        g.destroy();
      },
      right: () => {
        const g = this.g();
        g.fillStyle(body, 1).fillRoundedRect(6, 14, 20, 22, 4);
        g.fillStyle(skin, 1).fillCircle(18, 10, 9);
        g.fillStyle(0x222222, 1).fillCircle(21, 9, 1.6);
        g.generateTexture("player-right", 32, 40);
        g.destroy();
      },
    };
    Object.values(dirs).forEach((fn) => fn());
  }

  private makeTreeTextures(): void {
    let g = this.g();
    g.fillStyle(0x6b4423, 1).fillRect(16, 30, 8, 16);
    g.fillStyle(0x2f5d2f, 1).fillCircle(20, 20, 18);
    g.fillStyle(0x3a7a3a, 1).fillCircle(20, 14, 14);
    g.generateTexture("tree", 40, 48);
    g.destroy();

    g = this.g();
    g.fillStyle(0x6b4423, 1).fillRect(16, 34, 8, 12);
    g.fillStyle(0x8a6a4a, 1).fillCircle(20, 34, 6);
    g.generateTexture("tree-stump", 40, 48);
    g.destroy();
  }

  private makeRockTextures(): void {
    let g = this.g();
    g.fillStyle(0x7d7d87, 1).fillEllipse(18, 16, 30, 22);
    g.fillStyle(0x9d9da7, 1).fillEllipse(14, 11, 12, 9);
    g.fillStyle(0xd08a3a, 1).fillCircle(22, 18, 3).fillCircle(12, 20, 2.5);
    g.generateTexture("rock", 36, 28);
    g.destroy();

    g = this.g();
    g.fillStyle(0x55555c, 1).fillEllipse(18, 20, 26, 12);
    g.generateTexture("rock-depleted", 36, 28);
    g.destroy();
  }

  private makeFishingSpotTextures(): void {
    let g = this.g();
    g.fillStyle(0x2f6ea5, 0.85).fillEllipse(20, 12, 38, 22);
    g.lineStyle(2, 0x9fd3f0, 0.9).strokeCircle(20, 12, 8);
    g.strokeCircle(20, 12, 14);
    g.generateTexture("fishingspot", 40, 24);
    g.destroy();

    g = this.g();
    g.fillStyle(0x2f6ea5, 0.5).fillEllipse(20, 12, 38, 22);
    g.generateTexture("fishingspot-depleted", 40, 24);
    g.destroy();
  }

  private makeDummyTexture(): void {
    const g = this.g();
    g.fillStyle(0x6b4423, 1).fillRect(12, 30, 4, 10);
    g.fillStyle(0xc9a06a, 1).fillRoundedRect(6, 8, 16, 24, 3);
    g.fillStyle(0xa5763a, 1).fillCircle(14, 6, 6);
    g.lineStyle(2, 0x3a2a1a, 1).strokeRoundedRect(6, 8, 16, 24, 3);
    g.generateTexture("dummy", 28, 40);
    g.destroy();
  }

  private makeStationTextures(): void {
    let g = this.g();
    g.fillStyle(0x444444, 1).fillRoundedRect(2, 14, 32, 16, 3);
    g.fillStyle(0x222222, 1).fillRect(14, 4, 8, 14);
    g.fillStyle(0xe08a3a, 1).fillTriangle(14, 4, 22, 4, 18, 14);
    g.generateTexture("anvil", 36, 32);
    g.destroy();

    g = this.g();
    g.fillStyle(0x555555, 1).fillCircle(16, 24, 10);
    const flameColors = [0xff8c3a, 0xffbf3a, 0xfff0a0];
    flameColors.forEach((c, i) => {
      g.fillStyle(c, 1).fillTriangle(
        16,
        6 + i * 4,
        11 - i,
        22,
        21 + i,
        22,
      );
    });
    g.generateTexture("campfire", 32, 32);
    g.destroy();
  }

  private makeGroundTextures(): void {
    const g = this.g();
    g.fillStyle(0x3f7d3f, 1).fillRect(0, 0, 64, 64);
    g.fillStyle(0x467d46, 0.6);
    for (let i = 0; i < 10; i++) {
      g.fillRect(
        Phaser.Math.Between(0, 60),
        Phaser.Math.Between(0, 60),
        4,
        4,
      );
    }
    g.generateTexture("grass", 64, 64);
    g.destroy();
  }
}
