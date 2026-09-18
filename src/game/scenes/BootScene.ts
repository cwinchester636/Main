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

  /**
   * Chibi-proportioned player: big head, stubby legs that alternate between
   * 3 frames for a walk cycle, blush + a hair cowlick for personality.
   * Generates player-{down,up,left,right}-{0,1,2} and registers a
   * walk/idle animation per direction.
   */
  private makePlayerTextures(): void {
    const skin = 0xffd9a8;
    const hair = 0x4a3728;
    const shirt = 0x4f8fdb;
    const shirtShade = 0x3d73b8;
    const blush = 0xff9eb5;
    const legColor = 0x2e2e38;
    const eye = 0x2b2b2b;

    const cx = 16;
    const headCy = 12;
    const headR = 10;

    const dirs: Array<"down" | "up" | "left" | "right"> = ["down", "up", "left", "right"];

    for (const dir of dirs) {
      for (let frame = 0; frame < 3; frame++) {
        const g = this.g();
        // Frames 1 & 2 are mid-step: legs splay apart and the whole body
        // lifts 1px, giving a little bounce; frame 0 is the neutral stance.
        const lift = frame === 0 ? 0 : 1;
        const splay = frame === 1 ? 2 : frame === 2 ? -2 : 0;
        const headY = headCy - lift;
        const bodyTop = 20 - lift;

        // Legs (drawn first so the body/head overlap them).
        g.fillStyle(legColor, 1);
        g.fillRoundedRect(cx - 6 - splay, 32, 5, 7, 2);
        g.fillRoundedRect(cx + 1 + splay, 32, 5, 7, 2);

        // Body.
        g.fillStyle(shirt, 1);
        g.fillRoundedRect(cx - 9, bodyTop, 18, 13, 5);
        g.fillStyle(shirtShade, 1);
        g.fillRoundedRect(cx - 9, bodyTop + 8, 18, 5, { tl: 0, tr: 0, bl: 5, br: 5 });

        // Head + back-hair cap.
        g.fillStyle(hair, 1);
        g.fillEllipse(cx, headY - headR + 3, headR * 2 + 2, 11);
        g.fillStyle(skin, 1);
        g.fillCircle(cx, headY, headR);

        // Cowlick.
        g.fillStyle(hair, 1);
        g.fillTriangle(cx - 2, headY - headR + 2, cx + 2, headY - headR + 2, cx, headY - headR - 5);

        // Face, direction-dependent (back of head shows no face when facing up).
        if (dir === "down") {
          g.fillStyle(eye, 1).fillCircle(cx - 4, headY, 1.6).fillCircle(cx + 4, headY, 1.6);
          g.fillStyle(blush, 0.85).fillCircle(cx - 7, headY + 3, 2).fillCircle(cx + 7, headY + 3, 2);
        } else if (dir === "left") {
          g.fillStyle(eye, 1).fillCircle(cx - 5, headY, 1.7);
          g.fillStyle(blush, 0.85).fillCircle(cx - 6, headY + 4, 1.8);
        } else if (dir === "right") {
          g.fillStyle(eye, 1).fillCircle(cx + 5, headY, 1.7);
          g.fillStyle(blush, 0.85).fillCircle(cx + 6, headY + 4, 1.8);
        }

        g.generateTexture(`player-${dir}-${frame}`, 32, 40);
        g.destroy();
      }
    }

    for (const dir of dirs) {
      this.anims.create({
        key: `walk-${dir}`,
        frames: [
          { key: `player-${dir}-1` },
          { key: `player-${dir}-0` },
          { key: `player-${dir}-2` },
          { key: `player-${dir}-0` },
        ],
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${dir}`,
        frames: [{ key: `player-${dir}-0` }],
        frameRate: 1,
      });
    }

    const shadow = this.g();
    shadow.fillStyle(0x000000, 0.28).fillEllipse(12, 6, 22, 9);
    shadow.generateTexture("player-shadow", 24, 12);
    shadow.destroy();
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
