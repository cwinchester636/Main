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
    this.makeVegetationTextures();
    this.makeCritterTextures();
    this.makeVillageTextures();
    this.makeNpcTextures();

    this.scene.start("Game");
    this.scene.launch("UI");
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  private static readonly PLAYER_PALETTE = {
    skin: 0xffd9a8,
    hair: 0x4a3728,
    shirt: 0x4f8fdb,
    shirtShade: 0x3d73b8,
    blush: 0xff9eb5,
    legColor: 0x2e2e38,
    eye: 0x2b2b2b,
  };

  /** Draws the shared chibi body/head/legs/face onto `g`; used by both the walk cycle and action frames. */
  private drawChibiBody(
    g: Phaser.GameObjects.Graphics,
    dir: "down" | "up" | "left" | "right",
    opts: { lift?: number; splay?: number; palette?: typeof BootScene.PLAYER_PALETTE } = {},
  ): { cx: number; headY: number } {
    const { skin, hair, shirt, shirtShade, blush, legColor, eye } =
      opts.palette ?? BootScene.PLAYER_PALETTE;
    const lift = opts.lift ?? 0;
    const splay = opts.splay ?? 0;
    const cx = 20;
    const headCy = 12;
    const headR = 10;
    const headY = headCy - lift;
    const bodyTop = 20 - lift;

    g.fillStyle(legColor, 1);
    g.fillRoundedRect(cx - 6 - splay, 32, 5, 7, 2);
    g.fillRoundedRect(cx + 1 + splay, 32, 5, 7, 2);

    g.fillStyle(shirt, 1);
    g.fillRoundedRect(cx - 9, bodyTop, 18, 13, 5);
    g.fillStyle(shirtShade, 1);
    g.fillRoundedRect(cx - 9, bodyTop + 8, 18, 5, { tl: 0, tr: 0, bl: 5, br: 5 });

    g.fillStyle(hair, 1);
    g.fillEllipse(cx, headY - headR + 3, headR * 2 + 2, 11);
    g.fillStyle(skin, 1);
    g.fillCircle(cx, headY, headR);

    g.fillStyle(hair, 1);
    g.fillTriangle(cx - 2, headY - headR + 2, cx + 2, headY - headR + 2, cx, headY - headR - 5);

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

    return { cx, headY };
  }

  /** Draws a held tool/weapon as a thick line from `pivot` to `tip`, with a head shape at the tip. */
  private drawHeldItem(
    g: Phaser.GameObjects.Graphics,
    pivot: [number, number],
    tip: [number, number],
    handleColor: number,
    headColor: number,
    headShape: "blob" | "blade",
  ): void {
    g.lineStyle(3, handleColor, 1);
    g.lineBetween(pivot[0], pivot[1], tip[0], tip[1]);
    g.fillStyle(headColor, 1);
    if (headShape === "blob") {
      g.fillCircle(tip[0], tip[1], 3.2);
    } else {
      const dx = tip[0] - pivot[0];
      const dy = tip[1] - pivot[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 2.6;
      const ny = (dx / len) * 2.6;
      g.fillTriangle(
        tip[0] + nx,
        tip[1] + ny,
        tip[0] - nx,
        tip[1] - ny,
        tip[0] + (dx / len) * 7,
        tip[1] + (dy / len) * 7,
      );
    }
  }

  /**
   * Chibi-proportioned player: big head, stubby legs that alternate between
   * 3 frames for a walk cycle, blush + a hair cowlick for personality.
   * Generates player-{down,up,left,right}-{0,1,2} plus a 2-frame gather
   * swing and a 2-frame attack swing per direction, and registers
   * walk/idle/gather/attack animations for each.
   */
  private makePlayerTextures(): void {
    const dirs: Array<"down" | "up" | "left" | "right"> = ["down", "up", "left", "right"];

    for (const dir of dirs) {
      for (let frame = 0; frame < 3; frame++) {
        const g = this.g();
        // Frames 1 & 2 are mid-step: legs splay apart and the whole body
        // lifts 1px, giving a little bounce; frame 0 is the neutral stance.
        const lift = frame === 0 ? 0 : 1;
        const splay = frame === 1 ? 2 : frame === 2 ? -2 : 0;
        this.drawChibiBody(g, dir, { lift, splay });
        g.generateTexture(`player-${dir}-${frame}`, 40, 40);
        g.destroy();
      }
    }

    // Swing arcs: a windup (tool/weapon raised) and a strike (swung across
    // the front), anchored near the character's hand for each direction.
    const swingPoints: Record<
      "down" | "up" | "left" | "right",
      { pivot: [number, number]; windup: [number, number]; strike: [number, number] }
    > = {
      down: { pivot: [28, 22], windup: [34, 10], strike: [24, 34] },
      up: { pivot: [12, 22], windup: [6, 10], strike: [16, 4] },
      left: { pivot: [11, 24], windup: [2, 14], strike: [8, 34] },
      right: { pivot: [29, 24], windup: [38, 14], strike: [32, 34] },
    };

    const toolColors = { handle: 0x8a6a4a, head: 0x9d9da7 } as const;
    const swordColors = { handle: 0x6b4423, head: 0xd8d8e4 } as const;

    for (const dir of dirs) {
      const { pivot, windup, strike } = swingPoints[dir];

      const gatherWindup = this.g();
      this.drawChibiBody(gatherWindup, dir, {});
      this.drawHeldItem(gatherWindup, pivot, windup, toolColors.handle, toolColors.head, "blob");
      gatherWindup.generateTexture(`player-${dir}-gather-0`, 40, 40);
      gatherWindup.destroy();

      const gatherStrike = this.g();
      this.drawChibiBody(gatherStrike, dir, { lift: 1 });
      this.drawHeldItem(gatherStrike, pivot, strike, toolColors.handle, toolColors.head, "blob");
      gatherStrike.generateTexture(`player-${dir}-gather-1`, 40, 40);
      gatherStrike.destroy();

      const attackWindup = this.g();
      this.drawChibiBody(attackWindup, dir, {});
      this.drawHeldItem(attackWindup, pivot, windup, swordColors.handle, swordColors.head, "blade");
      attackWindup.generateTexture(`player-${dir}-attack-0`, 40, 40);
      attackWindup.destroy();

      const attackStrike = this.g();
      this.drawChibiBody(attackStrike, dir, { lift: 1 });
      this.drawHeldItem(attackStrike, pivot, strike, swordColors.handle, swordColors.head, "blade");
      attackStrike.generateTexture(`player-${dir}-attack-1`, 40, 40);
      attackStrike.destroy();
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
      this.anims.create({
        key: `gather-${dir}`,
        frames: [{ key: `player-${dir}-gather-0` }, { key: `player-${dir}-gather-1` }],
        frameRate: 5,
        repeat: 1,
      });
      this.anims.create({
        key: `attack-${dir}`,
        frames: [{ key: `player-${dir}-attack-0` }, { key: `player-${dir}-attack-1` }],
        frameRate: 8,
        repeat: 0,
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

  private makeVegetationTextures(): void {
    const petalColors = [0xe85c7a, 0xc86ce8, 0xf0c23a];
    petalColors.forEach((color, i) => {
      const g = this.g();
      g.fillStyle(0x3a6b2f, 1).fillRect(6, 8, 2, 6);
      g.fillStyle(color, 1);
      g.fillCircle(4, 6, 3).fillCircle(10, 6, 3).fillCircle(7, 3, 3).fillCircle(7, 9, 3);
      g.fillStyle(0xffe066, 1).fillCircle(7, 6, 2.2);
      g.generateTexture(`flower-${i}`, 14, 16);
      g.destroy();
    });

    let g = this.g();
    g.fillStyle(0x2f5d2f, 1).fillCircle(10, 12, 9).fillCircle(20, 12, 9).fillCircle(15, 8, 10);
    g.fillStyle(0x3a7a3a, 1).fillCircle(15, 9, 7);
    g.generateTexture("bush", 30, 22);
    g.destroy();

    g = this.g();
    g.fillStyle(0x6b6b6b, 1).fillEllipse(10, 7, 18, 10);
    g.fillStyle(0x8a8a8a, 1).fillEllipse(7, 5, 7, 5);
    g.generateTexture("pebble", 20, 12);
    g.destroy();
  }

  private makeCritterTextures(): void {
    // Butterfly: two wing-spread states for a simple flutter animation.
    const wingColors = [0xf0a23a, 0x8ab4e8];
    wingColors.forEach((color, i) => {
      let g = this.g();
      g.fillStyle(0x2b2b2b, 1).fillEllipse(8, 6, 2, 5);
      g.fillStyle(color, 0.9);
      g.fillEllipse(4, 4, 7, 5).fillEllipse(12, 4, 7, 5);
      g.fillEllipse(4, 9, 5, 4).fillEllipse(12, 9, 5, 4);
      g.generateTexture(`butterfly-${i}-open`, 16, 14);
      g.destroy();

      g = this.g();
      g.fillStyle(0x2b2b2b, 1).fillEllipse(8, 6, 2, 5);
      g.fillStyle(color, 0.9);
      g.fillEllipse(6, 4, 3, 5).fillEllipse(10, 4, 3, 5);
      g.fillEllipse(6, 9, 2.5, 4).fillEllipse(10, 9, 2.5, 4);
      g.generateTexture(`butterfly-${i}-closed`, 16, 14);
      g.destroy();
    });
    for (let i = 0; i < wingColors.length; i++) {
      this.anims.create({
        key: `butterfly-flutter-${i}`,
        frames: [{ key: `butterfly-${i}-open` }, { key: `butterfly-${i}-closed` }],
        frameRate: 10,
        repeat: -1,
      });
    }

    // Rabbit: sitting (idle) and stretched (hop) poses.
    let g = this.g();
    g.fillStyle(0xdedad2, 1).fillEllipse(9, 9, 14, 10);
    g.fillEllipse(4, 3, 3, 7).fillEllipse(8, 3, 3, 7);
    g.fillStyle(0xf5b8c4, 1).fillEllipse(4, 1, 1.4, 4).fillEllipse(8, 1, 1.4, 4);
    g.fillStyle(0x2b2b2b, 1).fillCircle(13, 7, 1);
    g.generateTexture("rabbit-idle", 18, 14);
    g.destroy();

    g = this.g();
    g.fillStyle(0xdedad2, 1).fillEllipse(10, 8, 17, 8);
    g.fillEllipse(5, 3, 3, 6).fillEllipse(9, 2, 3, 7);
    g.fillStyle(0xf5b8c4, 1).fillEllipse(5, 1, 1.2, 3.4).fillEllipse(9, 0, 1.2, 4);
    g.fillStyle(0x2b2b2b, 1).fillCircle(17, 6, 1);
    g.generateTexture("rabbit-hop", 20, 12);
    g.destroy();
  }

  /** A small house shape with a distinct roof color and an icon on its sign, for each shop type. */
  private makeBuildingTexture(
    key: string,
    wallColor: number,
    roofColor: number,
    drawIcon: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    const g = this.g();
    const w = 64;
    const h = 56;
    g.fillStyle(0x000000, 0.2).fillEllipse(w / 2, h - 3, w * 0.8, 8);
    g.fillStyle(wallColor, 1).fillRoundedRect(4, 22, w - 8, h - 26, 3);
    g.fillStyle(roofColor, 1).fillTriangle(0, 24, w, 24, w / 2, 0);
    g.fillStyle(0x2b2320, 1).fillRect(w / 2 - 8, h - 20, 16, 20);
    g.fillStyle(0xcfe3f2, 0.85).fillRect(10, 30, 12, 10).fillRect(w - 22, 30, 12, 10);
    g.fillStyle(0xffffff, 1).fillRoundedRect(w / 2 - 12, 2, 24, 14, 3);
    g.lineStyle(1, 0x2b2320, 0.6).strokeRoundedRect(w / 2 - 12, 2, 24, 14, 3);
    g.save();
    g.translateCanvas(w / 2, 9);
    drawIcon(g);
    g.restore();
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeVillageTextures(): void {
    const plazaW = 340;
    const plazaH = 300;
    const plaza = this.g();
    plaza.fillStyle(0xc9a973, 1).fillEllipse(plazaW / 2, plazaH / 2, plazaW, plazaH);
    plaza.fillStyle(0xb8925c, 0.5);
    for (let i = 0; i < 26; i++) {
      plaza.fillCircle(
        Phaser.Math.Between(10, plazaW - 10),
        Phaser.Math.Between(10, plazaH - 10),
        Phaser.Math.Between(2, 4),
      );
    }
    plaza.generateTexture("dirt-plaza", plazaW, plazaH);
    plaza.destroy();

    this.makeBuildingTexture("building-generalStore", 0xd9c08a, 0x8a5a3a, (g) => {
      g.fillStyle(0x8a5a3a, 1).fillRect(-6, -5, 12, 10);
      g.lineStyle(1, 0x5a3a20, 1).strokeRect(-6, -5, 12, 10).lineBetween(-6, 0, 6, 0);
    });
    this.makeBuildingTexture("building-blacksmith", 0x9a9a9a, 0x5a3a3a, (g) => {
      g.fillStyle(0x3a3a3a, 1).fillRect(-6, -1, 9, 4);
      g.fillRect(-8, -5, 4, 10);
    });
    this.makeBuildingTexture("building-carpenter", 0xc9a973, 0x6b8a4a, (g) => {
      g.fillStyle(0x6b4423, 1).fillRect(-7, -1, 14, 2);
      g.fillStyle(0x9d9da7, 1).fillCircle(0, 0, 5);
      g.fillStyle(0xc9a973, 1).fillCircle(0, 0, 2);
    });
    this.makeBuildingTexture("building-magicShop", 0x6a4a8a, 0x3a2a5a, (g) => {
      g.fillStyle(0xffe066, 1);
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const a2 = (Math.PI * 2 * (i + 0.5)) / 5 - Math.PI / 2;
        g.fillTriangle(0, 0, Math.cos(a) * 6, Math.sin(a) * 6, Math.cos(a2) * 3, Math.sin(a2) * 3);
      }
    });

    let g = this.g();
    g.fillStyle(0x8a6a4a, 1).fillRect(0, 0, 90, 40);
    g.lineStyle(1, 0x5a3a20, 0.6);
    for (let i = 0; i <= 90; i += 10) g.lineBetween(i, 0, i, 40);
    g.fillStyle(0x6b4423, 1).fillRect(0, 0, 6, 40).fillRect(84, 0, 6, 40);
    g.generateTexture("dock", 90, 40);
    g.destroy();

    g = this.g();
    g.fillStyle(0x8a5a3a, 1).fillEllipse(18, 10, 36, 14);
    g.fillStyle(0xc9a973, 1).fillEllipse(18, 7, 30, 8);
    g.lineStyle(2, 0x6b4423, 1).lineBetween(18, 7, 18, -10);
    g.fillStyle(0xe8e0d0, 0.95).fillTriangle(18, -10, 18, 6, 32, 6);
    g.generateTexture("boat", 40, 20);
    g.destroy();
  }

  private makeNpcTextures(): void {
    const base = BootScene.PLAYER_PALETTE;
    const npcPalettes: Record<string, Partial<typeof BootScene.PLAYER_PALETTE>> = {
      generalStore: { shirt: 0x3aa6a0, shirtShade: 0x2c8580, hair: 0x2b2320 },
      blacksmith: { shirt: 0x8a3a3a, shirtShade: 0x6e2e2e, hair: 0x8a8a8a },
      carpenter: { shirt: 0x8a6a3a, shirtShade: 0x6e552e, hair: 0x5a4a3a },
      magicShop: { shirt: 0x7a3ae8, shirtShade: 0x5f2cb8, hair: 0xe8e0f0 },
      harborMaster: { shirt: 0x2a4a7a, shirtShade: 0x203a60, hair: 0xc8a868 },
      villager1: { shirt: 0xe08a3a, shirtShade: 0xb86e2c, hair: 0x3a2a20 },
      villager2: { shirt: 0xe86ca0, shirtShade: 0xb8547e, hair: 0x2b2320 },
    };

    for (const [id, overrides] of Object.entries(npcPalettes)) {
      const g = this.g();
      this.drawChibiBody(g, "down", { palette: { ...base, ...overrides } });
      g.generateTexture(`npc-${id}`, 40, 40);
      g.destroy();
    }
  }
}
