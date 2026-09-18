import Phaser from "phaser";
import {
  ALL_SKILL_IDS,
  MAX_LEVEL,
  SKILL_DEFINITIONS,
  type SkillId,
} from "../data/skills";
import { ITEM_DEFINITIONS, type ItemId } from "../data/items";
import { RECIPES } from "../data/recipes";
import type { SkillGainEvent, SkillLevelUpEvent, SkillSystem } from "../systems/SkillSystem";
import type { InventorySystem } from "../systems/InventorySystem";

const PANEL_WIDTH = 210;

export class UIScene extends Phaser.Scene {
  private skills!: SkillSystem;
  private inventory!: InventorySystem;

  private skillRows = new Map<
    SkillId,
    { levelText: Phaser.GameObjects.Text; barFill: Phaser.GameObjects.Rectangle }
  >();
  private totalLevelText!: Phaser.GameObjects.Text;

  private promptText!: Phaser.GameObjects.Text;
  private inventoryContainer!: Phaser.GameObjects.Container;

  private craftingPanel!: Phaser.GameObjects.Container;
  private craftingOpenLabel: string | null = null;
  private toastQueue: SkillLevelUpEvent[] = [];
  private toastBusy = false;

  constructor() {
    super("UI");
  }

  create(): void {
    this.skills = this.game.registry.get("skills");
    this.inventory = this.game.registry.get("inventory");

    this.buildSkillsPanel();
    this.buildPrompt();
    this.buildInventoryBar();
    this.buildCraftingPanel();

    this.skills.on("xpGained", (e: SkillGainEvent) => this.refreshSkillRow(e.skillId));
    this.skills.on("levelUp", (e: SkillLevelUpEvent) => this.queueToast(e));
    this.inventory.on("change", () => this.refreshInventoryBar());

    const game = this.scene.get("Game");
    game.events.on("interactTarget", (text: string | null) => {
      this.promptText.setText(text ?? "");
      this.promptText.setVisible(!!text);
    });
    game.events.on(
      "openCrafting",
      (skillsFor: SkillId[], label: string) => this.toggleCraftingPanel(skillsFor, label),
    );

    for (const id of ALL_SKILL_IDS) this.refreshSkillRow(id);
    this.refreshInventoryBar();
  }

  // ---------- Skills panel ----------

  private buildSkillsPanel(): void {
    const { width } = this.scale;
    const x = width - PANEL_WIDTH - 12;
    const y = 12;
    const rowHeight = 30;

    const bg = this.add.rectangle(
      x,
      y,
      PANEL_WIDTH,
      rowHeight * ALL_SKILL_IDS.length + 40,
      0x0b0b12,
      0.65,
    );
    bg.setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.15).setScrollFactor(0);

    this.totalLevelText = this.add
      .text(x + 10, y + 8, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffe066",
      })
      .setScrollFactor(0);

    ALL_SKILL_IDS.forEach((id, i) => {
      const def = SKILL_DEFINITIONS[id];
      const rowY = y + 32 + i * rowHeight;

      this.add
        .text(x + 10, rowY, def.name, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#e8e8f0",
        })
        .setScrollFactor(0);

      const levelText = this.add
        .text(x + PANEL_WIDTH - 40, rowY, "1", {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#ffffff",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0);

      const barBg = this.add
        .rectangle(x + 10, rowY + 16, PANEL_WIDTH - 20, 4, 0xffffff, 0.15)
        .setOrigin(0, 0)
        .setScrollFactor(0);
      const barFill = this.add
        .rectangle(x + 10, rowY + 16, 0, 4, def.color)
        .setOrigin(0, 0)
        .setScrollFactor(0);
      void barBg;

      this.skillRows.set(id, { levelText, barFill });
    });
  }

  private refreshSkillRow(id: SkillId): void {
    const row = this.skillRows.get(id);
    if (!row) return;
    const level = this.skills.getLevel(id);
    row.levelText.setText(level >= MAX_LEVEL ? "MAX" : String(level));
    row.barFill.width = (PANEL_WIDTH - 20) * this.skills.getProgress(id);
    this.totalLevelText.setText(`Total Level: ${this.skills.getTotalLevel()}`);
  }

  // ---------- Level-up toast ----------

  private queueToast(e: SkillLevelUpEvent): void {
    this.toastQueue.push(e);
    if (!this.toastBusy) this.playNextToast();
  }

  private playNextToast(): void {
    const next = this.toastQueue.shift();
    if (!next) {
      this.toastBusy = false;
      return;
    }
    this.toastBusy = true;

    const def = SKILL_DEFINITIONS[next.skillId];
    const { width } = this.scale;
    const text = this.add
      .text(width / 2, 90, `${def.name} level up! ${next.newLevel}`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffe066",
        backgroundColor: "#000000aa",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 70,
      duration: 250,
      ease: "Cubic.Out",
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: text,
            alpha: 0,
            y: 50,
            duration: 300,
            onComplete: () => {
              text.destroy();
              this.playNextToast();
            },
          });
        });
      },
    });
  }

  // ---------- Interact prompt ----------

  private buildPrompt(): void {
    this.promptText = this.add
      .text(this.scale.width / 2, this.scale.height - 40, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
  }

  // ---------- Inventory bar ----------

  private buildInventoryBar(): void {
    this.inventoryContainer = this.add.container(12, this.scale.height - 44);
    this.inventoryContainer.setScrollFactor(0);
  }

  private refreshInventoryBar(): void {
    this.inventoryContainer.removeAll(true);
    const entries = Object.entries(this.inventory.getAll()).filter(
      ([, qty]) => (qty ?? 0) > 0,
    );

    entries.forEach(([itemId, qty], i) => {
      const def = ITEM_DEFINITIONS[itemId as keyof typeof ITEM_DEFINITIONS];
      const x = i * 56;
      const box = this.add
        .rectangle(x, 0, 48, 32, 0x0b0b12, 0.7)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0xffffff, 0.15);
      const swatch = this.add
        .rectangle(x + 6, 6, 12, 12, def.color)
        .setOrigin(0, 0);
      const label = this.add
        .text(x + 22, 4, def.name.split(" ")[0], {
          fontFamily: "monospace",
          fontSize: "9px",
          color: "#dddddd",
        })
        .setOrigin(0, 0);
      const count = this.add
        .text(x + 6, 18, `x${qty}`, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#ffffff",
        })
        .setOrigin(0, 0);
      this.inventoryContainer.add([box, swatch, label, count]);
    });
  }

  // ---------- Crafting panel ----------

  private buildCraftingPanel(): void {
    this.craftingPanel = this.add.container(0, 0).setVisible(false);
  }

  private toggleCraftingPanel(skillsFor: SkillId[], label: string): void {
    if (this.craftingPanel.visible && this.craftingOpenLabel === label) {
      this.craftingPanel.setVisible(false);
      this.craftingOpenLabel = null;
      return;
    }
    this.craftingOpenLabel = label;
    this.renderCraftingPanel(skillsFor, label);
    this.craftingPanel.setVisible(true);
  }

  private renderCraftingPanel(skillsFor: SkillId[], label: string): void {
    this.craftingPanel.removeAll(true);
    const { width, height } = this.scale;
    const recipes = RECIPES.filter((r) => skillsFor.includes(r.skill));

    const panelW = 320;
    const panelH = 46 + recipes.length * 54 + 10;
    const x = width / 2 - panelW / 2;
    const y = height / 2 - panelH / 2;

    const bg = this.add
      .rectangle(x, y, panelW, panelH, 0x0b0b12, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.25)
      .setScrollFactor(0);
    const title = this.add
      .text(x + 12, y + 10, label, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffe066",
      })
      .setScrollFactor(0);
    const closeBtn = this.add
      .text(x + panelW - 26, y + 8, "[X]", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ff8080",
      })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.craftingPanel.setVisible(false);
        this.craftingOpenLabel = null;
      });

    this.craftingPanel.add([bg, title, closeBtn]);

    recipes.forEach((recipe, i) => {
      const rowY = y + 44 + i * 54;
      const level = this.skills.getLevel(recipe.skill);
      const meetsLevel = level >= recipe.levelRequired;
      const meetsItems = this.inventory.hasAll(recipe.inputs);
      const canCraft = meetsLevel && meetsItems;

      const inputsText = Object.entries(recipe.inputs)
        .map(([id, qty]) => {
          const itemId = id as ItemId;
          const owned = this.inventory.getQuantity(itemId);
          const name = ITEM_DEFINITIONS[itemId].name;
          return `${name} x${qty} (${owned})`;
        })
        .join("  ");

      const nameColor = meetsLevel ? "#e8e8f0" : "#888888";
      const nameLine = this.add
        .text(
          x + 12,
          rowY,
          `${recipe.name}  (Lv.${recipe.levelRequired})`,
          { fontFamily: "monospace", fontSize: "12px", color: nameColor },
        )
        .setScrollFactor(0);

      const inputLine = this.add
        .text(x + 12, rowY + 16, inputsText, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: meetsItems ? "#8fd98f" : "#e08080",
        })
        .setScrollFactor(0);

      const craftBtn = this.add
        .text(x + panelW - 70, rowY + 4, "[Craft]", {
          fontFamily: "monospace",
          fontSize: "12px",
          color: canCraft ? "#66ff99" : "#555555",
        })
        .setScrollFactor(0);

      if (canCraft) {
        craftBtn.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          if (!this.inventory.removeAll(recipe.inputs)) return;
          this.inventory.add(recipe.output.item, recipe.output.quantity);
          this.skills.addXp(recipe.skill, recipe.xp);
          this.renderCraftingPanel(skillsFor, label);
        });
      }

      this.craftingPanel.add([nameLine, inputLine, craftBtn]);
    });
  }
}
