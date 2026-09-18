import Phaser from "phaser";
import {
  ALL_SKILL_IDS,
  MAX_LEVEL,
  SKILL_DEFINITIONS,
  type SkillId,
} from "../data/skills";
import { ITEM_DEFINITIONS, type EquipSlot, type ItemId } from "../data/items";
import { RECIPES } from "../data/recipes";
import { SHOPS } from "../data/shops";
import { QUESTS } from "../data/quests";
import type { SkillGainEvent, SkillLevelUpEvent, SkillSystem } from "../systems/SkillSystem";
import type { InventorySystem } from "../systems/InventorySystem";
import type { TouchInput } from "../systems/TouchInput";
import type { EconomySystem } from "../systems/EconomySystem";
import type { EquipmentSystem } from "../systems/EquipmentSystem";
import type { QuestSystem } from "../systems/QuestSystem";

const EQUIP_SLOTS: EquipSlot[] = ["weapon", "armor", "accessory", "tool"];
const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: "Weapon",
  armor: "Armor",
  accessory: "Accessory",
  tool: "Tool",
};

const PANEL_WIDTH = 210;
const JOYSTICK_RADIUS = 46;
const INTERACT_BUTTON_RADIUS = 40;

export class UIScene extends Phaser.Scene {
  private skills!: SkillSystem;
  private inventory!: InventorySystem;
  private touchInput!: TouchInput;
  private economy!: EconomySystem;
  private equipment!: EquipmentSystem;
  private quests!: QuestSystem;

  private goldText!: Phaser.GameObjects.Text;
  private shopPanel!: Phaser.GameObjects.Container;
  private openShopId: string | null = null;
  private questPanel!: Phaser.GameObjects.Container;
  private openQuestId: string | null = null;
  private inventoryPanel!: Phaser.GameObjects.Container;
  private inventoryPanelOpen = false;

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

  private touchControlsContainer!: Phaser.GameObjects.Container;
  private joystickCenter = new Phaser.Math.Vector2();
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickZone!: Phaser.GameObjects.Zone;
  private interactButton!: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private touchControlsEnabled = false;
  private touchToggleText!: Phaser.GameObjects.Text;

  constructor() {
    super("UI");
  }

  create(): void {
    this.skills = this.game.registry.get("skills");
    this.inventory = this.game.registry.get("inventory");
    this.touchInput = this.game.registry.get("touchInput");
    this.economy = this.game.registry.get("economy");
    this.equipment = this.game.registry.get("equipment");
    this.quests = this.game.registry.get("quests");

    this.buildSkillsPanel();
    this.buildPrompt();
    this.buildInventoryBar();
    this.buildGoldDisplay();
    this.buildCraftingPanel();
    this.buildShopPanel();
    this.buildQuestPanel();
    this.buildInventoryPanel();
    this.buildTouchControls();

    this.skills.on("xpGained", (e: SkillGainEvent) => this.refreshSkillRow(e.skillId));
    this.skills.on("levelUp", (e: SkillLevelUpEvent) => this.queueToast(e));
    this.inventory.on("change", () => {
      this.refreshInventoryBar();
      if (this.shopPanel.visible && this.openShopId) this.renderShopPanel(this.openShopId);
      if (this.inventoryPanelOpen) this.renderInventoryPanel();
    });
    this.economy.on("change", (gold: number) => {
      this.goldText.setText(`Gold: ${gold}`);
      if (this.shopPanel.visible && this.openShopId) this.renderShopPanel(this.openShopId);
    });
    this.equipment.on("change", () => {
      if (this.inventoryPanelOpen) this.renderInventoryPanel();
    });

    const game = this.scene.get("Game");
    game.events.on("interactTarget", (text: string | null) => {
      this.promptText.setText(text ?? "");
      this.promptText.setVisible(!!text);
    });
    game.events.on(
      "openCrafting",
      (skillsFor: SkillId[], label: string) => this.toggleCraftingPanel(skillsFor, label),
    );
    game.events.on("openShop", (shopId: string) => this.toggleShopPanel(shopId));
    game.events.on("openQuest", (questId: string) => this.toggleQuestPanel(questId));

    this.input.keyboard!.on("keydown-I", () => this.toggleInventoryPanel());

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

  // ---------- Gold ----------

  private buildGoldDisplay(): void {
    this.goldText = this.add
      .text(12, 30, `Gold: ${this.economy.getGold()}`, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffe066",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0);
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

  // ---------- Shop panel ----------

  private buildShopPanel(): void {
    this.shopPanel = this.add.container(0, 0).setVisible(false);
  }

  private toggleShopPanel(shopId: string): void {
    if (this.shopPanel.visible && this.openShopId === shopId) {
      this.shopPanel.setVisible(false);
      this.openShopId = null;
      return;
    }
    this.openShopId = shopId;
    this.renderShopPanel(shopId);
    this.shopPanel.setVisible(true);
  }

  private renderShopPanel(shopId: string): void {
    this.shopPanel.removeAll(true);
    const shop = SHOPS[shopId];
    if (!shop) return;
    const { width, height } = this.scale;

    const rows = shop.sells.length + shop.buys.length;
    const panelW = 340;
    const panelH = 90 + rows * 26 + (shop.buys.length ? 20 : 0);
    const x = width / 2 - panelW / 2;
    const y = height / 2 - panelH / 2;

    const bg = this.add
      .rectangle(x, y, panelW, panelH, 0x0b0b12, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.25)
      .setScrollFactor(0);
    const title = this.add
      .text(x + 12, y + 10, shop.name, { fontFamily: "monospace", fontSize: "16px", color: "#ffe066" })
      .setScrollFactor(0);
    const goldLine = this.add
      .text(x + panelW - 90, y + 12, `Gold: ${this.economy.getGold()}`, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#ffe066",
      })
      .setScrollFactor(0);
    const closeBtn = this.add
      .text(x + panelW - 26, y + 8, "[X]", { fontFamily: "monospace", fontSize: "14px", color: "#ff8080" })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.shopPanel.setVisible(false);
        this.openShopId = null;
      });
    this.shopPanel.add([bg, title, goldLine, closeBtn]);

    let rowY = y + 40;
    if (shop.sells.length) {
      this.shopPanel.add(
        this.add
          .text(x + 12, rowY, "For Sale", { fontFamily: "monospace", fontSize: "11px", color: "#888888" })
          .setScrollFactor(0),
      );
      rowY += 20;
      for (const listing of shop.sells) {
        const def = ITEM_DEFINITIONS[listing.item];
        const canAfford = this.economy.canAfford(listing.price);
        const line = this.add
          .text(x + 12, rowY, `${def.name} — ${listing.price}g`, {
            fontFamily: "monospace",
            fontSize: "12px",
            color: canAfford ? "#e8e8f0" : "#888888",
          })
          .setScrollFactor(0);
        const btn = this.add
          .text(x + panelW - 70, rowY, "[Buy]", {
            fontFamily: "monospace",
            fontSize: "12px",
            color: canAfford ? "#66ff99" : "#555555",
          })
          .setScrollFactor(0);
        if (canAfford) {
          btn.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
            if (!this.economy.spend(listing.price)) return;
            this.inventory.add(listing.item, 1);
            this.renderShopPanel(shopId);
          });
        }
        this.shopPanel.add([line, btn]);
        rowY += 26;
      }
    }

    if (shop.buys.length) {
      rowY += 6;
      this.shopPanel.add(
        this.add
          .text(x + 12, rowY, "Sell Items", { fontFamily: "monospace", fontSize: "11px", color: "#888888" })
          .setScrollFactor(0),
      );
      rowY += 20;
      for (const listing of shop.buys) {
        const def = ITEM_DEFINITIONS[listing.item];
        const owned = this.inventory.getQuantity(listing.item);
        const line = this.add
          .text(x + 12, rowY, `${def.name} — ${listing.price}g  (have ${owned})`, {
            fontFamily: "monospace",
            fontSize: "12px",
            color: owned > 0 ? "#e8e8f0" : "#888888",
          })
          .setScrollFactor(0);
        const btn = this.add
          .text(x + panelW - 70, rowY, "[Sell]", {
            fontFamily: "monospace",
            fontSize: "12px",
            color: owned > 0 ? "#66ff99" : "#555555",
          })
          .setScrollFactor(0);
        if (owned > 0) {
          btn.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
            if (!this.inventory.remove(listing.item, 1)) return;
            this.economy.add(listing.price);
            this.renderShopPanel(shopId);
          });
        }
        this.shopPanel.add([line, btn]);
        rowY += 26;
      }
    }
  }

  // ---------- Quest panel ----------

  private buildQuestPanel(): void {
    this.questPanel = this.add.container(0, 0).setVisible(false);
  }

  private toggleQuestPanel(questId: string): void {
    if (this.questPanel.visible && this.openQuestId === questId) {
      this.questPanel.setVisible(false);
      this.openQuestId = null;
      return;
    }
    this.openQuestId = questId;
    this.renderQuestPanel(questId);
    this.questPanel.setVisible(true);
  }

  private renderQuestPanel(questId: string): void {
    this.questPanel.removeAll(true);
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) return;
    const { width, height } = this.scale;

    const panelW = 340;
    const panelH = 170;
    const x = width / 2 - panelW / 2;
    const y = height / 2 - panelH / 2;

    const bg = this.add
      .rectangle(x, y, panelW, panelH, 0x0b0b12, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.25)
      .setScrollFactor(0);
    const title = this.add
      .text(x + 12, y + 10, quest.title, { fontFamily: "monospace", fontSize: "16px", color: "#ffe066" })
      .setScrollFactor(0);
    const closeBtn = this.add
      .text(x + panelW - 26, y + 8, "[X]", { fontFamily: "monospace", fontSize: "14px", color: "#ff8080" })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.questPanel.setVisible(false);
        this.openQuestId = null;
      });
    const desc = this.add
      .text(x + 12, y + 36, quest.description, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#cccccc",
        wordWrap: { width: panelW - 24 },
      })
      .setScrollFactor(0);

    this.questPanel.add([bg, title, closeBtn, desc]);

    const state = this.quests.getState(questId);
    if (state === "completed") {
      this.questPanel.add(
        this.add
          .text(x + 12, y + 120, "Completed — thank you!", {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#66ff99",
          })
          .setScrollFactor(0),
      );
      return;
    }

    const owned = this.inventory.getQuantity(quest.requirement.item);
    const itemName = ITEM_DEFINITIONS[quest.requirement.item].name;
    const ready = owned >= quest.requirement.quantity;
    this.questPanel.add(
      this.add
        .text(
          x + 12,
          y + 100,
          `Need: ${itemName} x${quest.requirement.quantity} (have ${owned})`,
          { fontFamily: "monospace", fontSize: "12px", color: ready ? "#66ff99" : "#e08080" },
        )
        .setScrollFactor(0),
    );
    this.questPanel.add(
      this.add
        .text(x + 12, y + 118, `Reward: ${quest.reward.gold}g + ${quest.reward.xp} ${quest.reward.skill} XP`, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#ffe066",
        })
        .setScrollFactor(0),
    );

    const turnInBtn = this.add
      .text(x + 12, y + panelH - 30, ready ? "[Turn In]" : "[Not ready]", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: ready ? "#66ff99" : "#555555",
      })
      .setScrollFactor(0);
    if (ready) {
      turnInBtn.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        this.quests.turnIn(questId, this.inventory, this.economy, this.skills);
        this.renderQuestPanel(questId);
      });
    }
    this.questPanel.add(turnInBtn);
  }

  // ---------- Inventory & equipment panel ----------

  private buildInventoryPanel(): void {
    this.inventoryPanel = this.add.container(0, 0).setVisible(false);
  }

  private toggleInventoryPanel(): void {
    this.inventoryPanelOpen = !this.inventoryPanelOpen;
    if (this.inventoryPanelOpen) this.renderInventoryPanel();
    this.inventoryPanel.setVisible(this.inventoryPanelOpen);
  }

  private renderInventoryPanel(): void {
    this.inventoryPanel.removeAll(true);
    const { width, height } = this.scale;

    const equippableEntries = Object.entries(this.inventory.getAll()).filter(
      ([id, qty]) => (qty ?? 0) > 0 && !!ITEM_DEFINITIONS[id as ItemId].equip,
    );
    const otherEntries = Object.entries(this.inventory.getAll()).filter(
      ([id, qty]) => (qty ?? 0) > 0 && !ITEM_DEFINITIONS[id as ItemId].equip,
    );

    const panelW = 360;
    const panelH =
      140 + equippableEntries.length * 20 + Math.ceil(otherEntries.length / 2) * 18 + 30;
    const x = width / 2 - panelW / 2;
    const y = height / 2 - panelH / 2;

    const bg = this.add
      .rectangle(x, y, panelW, panelH, 0x0b0b12, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.25)
      .setScrollFactor(0);
    const title = this.add
      .text(x + 12, y + 10, "Inventory & Equipment", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ffe066",
      })
      .setScrollFactor(0);
    const closeBtn = this.add
      .text(x + panelW - 26, y + 8, "[X]", { fontFamily: "monospace", fontSize: "14px", color: "#ff8080" })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleInventoryPanel());
    this.inventoryPanel.add([bg, title, closeBtn]);

    const stats = this.equipment.getStats();
    const statsLine = this.add
      .text(
        x + 12,
        y + 34,
        `ATK ${stats.attack}   DEF ${stats.defense}   Gather Bonus +${stats.gatherXpBonusPct}%   XP Bonus +${stats.allXpBonusPct}%   Gold ${this.economy.getGold()}`,
        { fontFamily: "monospace", fontSize: "10px", color: "#8fd9ff" },
      )
      .setScrollFactor(0);
    this.inventoryPanel.add(statsLine);

    let rowY = y + 56;
    for (const slot of EQUIP_SLOTS) {
      const equippedId = this.equipment.getEquipped(slot);
      const label = equippedId ? ITEM_DEFINITIONS[equippedId].name : "(empty)";
      const line = this.add
        .text(x + 12, rowY, `${SLOT_LABELS[slot]}: ${label}`, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: equippedId ? "#e8e8f0" : "#888888",
        })
        .setScrollFactor(0);
      this.inventoryPanel.add(line);
      if (equippedId) {
        const btn = this.add
          .text(x + panelW - 80, rowY, "[Unequip]", {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#ff8080",
          })
          .setScrollFactor(0)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => {
            this.equipment.unequip(slot, this.inventory);
            this.renderInventoryPanel();
          });
        this.inventoryPanel.add(btn);
      }
      rowY += 18;
    }

    rowY += 8;
    this.inventoryPanel.add(
      this.add
        .text(x + 12, rowY, "Gear", { fontFamily: "monospace", fontSize: "11px", color: "#888888" })
        .setScrollFactor(0),
    );
    rowY += 18;
    for (const [id, qty] of equippableEntries) {
      const itemId = id as ItemId;
      const def = ITEM_DEFINITIONS[itemId];
      const line = this.add
        .text(x + 12, rowY, `${def.name} x${qty}`, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#e8e8f0",
        })
        .setScrollFactor(0);
      const btn = this.add
        .text(x + panelW - 70, rowY, "[Equip]", {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#66ff99",
        })
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.equipment.equip(itemId, this.inventory);
          this.renderInventoryPanel();
        });
      this.inventoryPanel.add([line, btn]);
      rowY += 20;
    }

    rowY += 8;
    this.inventoryPanel.add(
      this.add
        .text(x + 12, rowY, "Materials", { fontFamily: "monospace", fontSize: "11px", color: "#888888" })
        .setScrollFactor(0),
    );
    rowY += 18;
    otherEntries.forEach(([id, qty], i) => {
      const def = ITEM_DEFINITIONS[id as ItemId];
      const col = i % 2;
      const line = this.add
        .text(x + 12 + col * 170, rowY, `${def.name} x${qty}`, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#cccccc",
        })
        .setScrollFactor(0);
      this.inventoryPanel.add(line);
      if (col === 1) rowY += 18;
    });
  }

  // ---------- Touch controls ----------

  private buildTouchControls(): void {
    const { width, height } = this.scale;
    const hasTouch = this.sys.game.device.input.touch;

    this.joystickCenter.set(170, height - 150);

    const joystickBase = this.add
      .circle(this.joystickCenter.x, this.joystickCenter.y, JOYSTICK_RADIUS, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setScrollFactor(0);
    this.joystickThumb = this.add
      .circle(this.joystickCenter.x, this.joystickCenter.y, 22, 0xffffff, 0.35)
      .setScrollFactor(0);

    // Generous invisible catch area, bigger than the visible base, so a
    // finger landing near the joystick still grabs it.
    this.joystickZone = this.add
      .zone(this.joystickCenter.x, this.joystickCenter.y, JOYSTICK_RADIUS * 2.6, JOYSTICK_RADIUS * 2.6)
      .setScrollFactor(0);
    this.joystickZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId !== null) return;
      this.joystickPointerId = pointer.id;
      this.updateJoystick(pointer);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) this.updateJoystick(pointer);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) =>
      this.releaseJoystickIfMatching(pointer),
    );
    this.input.on("pointerupoutside", (pointer: Phaser.Input.Pointer) =>
      this.releaseJoystickIfMatching(pointer),
    );

    this.interactButton = this.add
      .circle(width - 80, height - 150, INTERACT_BUTTON_RADIUS, 0xffe066, 0.25)
      .setStrokeStyle(2, 0xffe066, 0.6)
      .setScrollFactor(0);
    const interactLabel = this.add
      .text(width - 80, height - 150, "E", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffe066",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.interactButton.on("pointerdown", () => {
      this.touchInput.pressInteract();
      this.interactButton.setFillStyle(0xffe066, 0.55);
    });
    this.interactButton.on("pointerup", () => this.interactButton.setFillStyle(0xffe066, 0.25));
    this.interactButton.on("pointerout", () => this.interactButton.setFillStyle(0xffe066, 0.25));

    this.touchControlsContainer = this.add.container(0, 0, [
      joystickBase,
      this.joystickThumb,
      this.joystickZone,
      this.interactButton,
      interactLabel,
    ]);

    this.touchToggleText = this.add
      .text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#aaaaaa",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.setTouchControlsEnabled(!this.touchControlsEnabled));

    this.setTouchControlsEnabled(hasTouch);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const offset = new Phaser.Math.Vector2(
      pointer.x - this.joystickCenter.x,
      pointer.y - this.joystickCenter.y,
    );
    const dist = Math.min(offset.length(), JOYSTICK_RADIUS);
    const clamped = offset.lengthSq() > 0 ? offset.clone().normalize().scale(dist) : offset;
    this.joystickThumb.setPosition(
      this.joystickCenter.x + clamped.x,
      this.joystickCenter.y + clamped.y,
    );
    this.touchInput.setMove(clamped.x / JOYSTICK_RADIUS, clamped.y / JOYSTICK_RADIUS);
  }

  private releaseJoystickIfMatching(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId) return;
    this.joystickPointerId = null;
    this.joystickThumb.setPosition(this.joystickCenter.x, this.joystickCenter.y);
    this.touchInput.clearMove();
  }

  private setTouchControlsEnabled(enabled: boolean): void {
    this.touchControlsEnabled = enabled;
    this.touchControlsContainer.setVisible(enabled);
    if (enabled) {
      this.joystickZone.setInteractive();
      // Arc/Shape game objects don't auto-compute a hit area from their
      // radius, so the default rectangular hit area silently misses clicks
      // unless we hand it an explicit circular one.
      this.interactButton.setInteractive({
        hitArea: new Phaser.Geom.Circle(
          INTERACT_BUTTON_RADIUS,
          INTERACT_BUTTON_RADIUS,
          INTERACT_BUTTON_RADIUS,
        ),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true,
      });
    } else {
      this.joystickZone.disableInteractive();
      this.interactButton.disableInteractive();
      this.joystickPointerId = null;
      this.touchInput.clearMove();
    }
    this.touchToggleText.setText(
      enabled ? "[hide touch controls]" : "[show touch controls]",
    );
  }
}
