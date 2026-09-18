import Phaser from "phaser";
import { Player } from "../entities/Player";
import { ResourceNode, type ResourceNodeConfig } from "../entities/ResourceNode";
import { TrainingDummy } from "../entities/TrainingDummy";
import { CraftingStation } from "../entities/CraftingStation";
import { Critter } from "../entities/Critter";
import { Npc } from "../entities/Npc";
import type { SkillSystem } from "../systems/SkillSystem";
import type { InventorySystem } from "../systems/InventorySystem";
import type { TouchInput } from "../systems/TouchInput";
import type { EconomySystem } from "../systems/EconomySystem";
import type { EquipmentSystem } from "../systems/EquipmentSystem";
import type { QuestSystem } from "../systems/QuestSystem";
import type { SkillId } from "../data/skills";
import { loadSave, writeSave } from "../systems/SaveSystem";

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1440;
const INTERACT_KEY = Phaser.Input.Keyboard.KeyCodes.E;

type Interactable = ResourceNode | TrainingDummy | CraftingStation | Npc;

export class GameScene extends Phaser.Scene {
  private skills!: SkillSystem;
  private inventory!: InventorySystem;
  private touchInput!: TouchInput;
  private economy!: EconomySystem;
  private equipment!: EquipmentSystem;
  private quests!: QuestSystem;
  private player!: Player;
  private nodes: ResourceNode[] = [];
  private dummy!: TrainingDummy;
  private stations: CraftingStation[] = [];
  private npcs: Npc[] = [];
  private keyE!: Phaser.Input.Keyboard.Key;
  private autosaveAccum = 0;

  constructor() {
    super("Game");
  }

  create(): void {
    this.skills = this.game.registry.get("skills");
    this.inventory = this.game.registry.get("inventory");
    this.touchInput = this.game.registry.get("touchInput");
    this.economy = this.game.registry.get("economy");
    this.equipment = this.game.registry.get("equipment");
    this.quests = this.game.registry.get("quests");

    const save = loadSave();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "grass")
      .setOrigin(0, 0);

    this.buildWorld();

    this.player = new Player(
      this,
      save?.playerX ?? WORLD_WIDTH / 2,
      save?.playerY ?? WORLD_HEIGHT / 2,
    );

    for (const node of this.nodes) {
      if (node.isSolid()) this.physics.add.collider(this.player, node);
    }
    for (const npc of this.npcs) {
      if (npc.body) this.physics.add.collider(this.player, npc);
    }

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.4);

    this.keyE = this.input.keyboard!.addKey(INTERACT_KEY);

    this.events.on("shutdown", () => this.saveNow());
    window.addEventListener("beforeunload", () => this.saveNow());
  }

  private buildWorld(): void {
    const mineConfig: Omit<ResourceNodeConfig, "label"> = {
      textureKey: "rock",
      depletedTextureKey: "rock-depleted",
      skill: "mining",
      item: "copperOre",
      xpPerAction: 6,
      itemsPerAction: 1,
      maxCharges: 4,
      actionDurationMs: 900,
      respawnDelayMs: 8000,
      interactionRadius: 46,
      collisionSize: { width: 26, height: 16 },
    };
    const treeConfig: Omit<ResourceNodeConfig, "label"> = {
      textureKey: "tree",
      depletedTextureKey: "tree-stump",
      skill: "woodcutting",
      item: "log",
      xpPerAction: 6,
      itemsPerAction: 1,
      maxCharges: 4,
      actionDurationMs: 900,
      respawnDelayMs: 8000,
      interactionRadius: 50,
      collisionSize: { width: 20, height: 20 },
    };
    const fishConfig: Omit<ResourceNodeConfig, "label"> = {
      textureKey: "fishingspot",
      depletedTextureKey: "fishingspot-depleted",
      skill: "fishing",
      item: "rawFish",
      xpPerAction: 7,
      itemsPerAction: 1,
      maxCharges: 6,
      actionDurationMs: 1100,
      respawnDelayMs: 6000,
      interactionRadius: 50,
    };

    const rockSpots: [number, number][] = [
      [420, 380],
      [520, 420],
      [340, 500],
      [900, 260],
    ];
    rockSpots.forEach(([x, y]) =>
      this.nodes.push(
        new ResourceNode(this, x, y, { ...mineConfig, label: "Copper Vein" }),
      ),
    );

    const treeSpots: [number, number][] = [
      [1100, 500],
      [1180, 580],
      [1050, 620],
      [700, 900],
    ];
    treeSpots.forEach(([x, y]) =>
      this.nodes.push(
        new ResourceNode(this, x, y, { ...treeConfig, label: "Tree" }),
      ),
    );

    const fishSpots: [number, number][] = [
      [1500, 1000],
      [1560, 1100],
    ];
    fishSpots.forEach(([x, y]) =>
      this.nodes.push(
        new ResourceNode(this, x, y, { ...fishConfig, label: "Fishing Spot" }),
      ),
    );

    this.dummy = new TrainingDummy(this, 900, 900);

    this.stations.push(
      new CraftingStation(this, 700, 700, "anvil", ["crafting"], "Anvil"),
    );
    this.stations.push(
      new CraftingStation(this, 760, 700, "campfire", ["cooking"], "Campfire"),
    );

    this.buildNature();
    this.buildVillage();
  }

  private buildVillage(): void {
    // Plaza with four shops clustered around it, in open space away from
    // the wilds; the harbor sits by the existing fishing spots.
    this.add.image(1750, 360, "dirt-plaza").setDepth(0.05);

    const buildings: [number, number, string][] = [
      [1650, 260, "building-generalStore"],
      [1850, 260, "building-blacksmith"],
      [1650, 430, "building-carpenter"],
      [1850, 430, "building-magicShop"],
    ];
    for (const [x, y, key] of buildings) {
      this.add.image(x, y, key).setDepth(0.4);
    }

    this.add.image(1590, 1030, "dock").setOrigin(0, 0.5).setDepth(0.15);
    this.add.image(1610, 1015, "boat").setDepth(0.16);
    this.add.image(1660, 1040, "boat").setScale(0.85).setDepth(0.16);

    const npcDefs: [number, number, string, string, string | undefined, string | undefined][] = [
      [1650, 300, "generalStore", "Mira", "generalStore", undefined],
      [1850, 300, "blacksmith", "Doran", "blacksmith", "blacksmithOre"],
      [1650, 470, "carpenter", "Wren", "carpenter", "carpenterLogs"],
      [1850, 470, "magicShop", "Ilyara", "magicShop", undefined],
      [1560, 990, "harborMaster", "Captain Voss", undefined, "harborFish"],
    ];
    for (const [x, y, textureId, name, shopId, questId] of npcDefs) {
      this.npcs.push(
        new Npc(this, x, y, { id: textureId, name, textureKey: `npc-${textureId}`, shopId, questId }),
      );
    }

    const villagerSpots: [number, number, string][] = [
      [1740, 380, "villager1"],
      [1790, 420, "villager2"],
    ];
    for (const [x, y, textureId] of villagerSpots) {
      this.npcs.push(
        new Npc(this, x, y, {
          id: `${textureId}-${x}`,
          name: textureId === "villager1" ? "Farmer Tam" : "Old Rosa",
          textureKey: `npc-${textureId}`,
          wander: true,
        }),
      );
    }
  }

  private buildNature(): void {
    const flowerClusters: [number, number][] = [
      [150, 150], [220, 180], [180, 230],
      [650, 130], [700, 170],
      [150, 750], [190, 800],
      [300, 1250], [360, 1280], [330, 1220],
      [1350, 780], [1400, 820],
    ];
    for (const [x, y] of flowerClusters) {
      const variant = Phaser.Math.Between(0, 2);
      this.add.image(x, y, `flower-${variant}`).setDepth(0.2);
    }

    const bushSpots: [number, number][] = [
      [120, 400], [1250, 250], [1300, 1200], [500, 1150], [80, 1000], [1600, 950],
    ];
    for (const [x, y] of bushSpots) {
      this.add.image(x, y, "bush").setDepth(0.3);
    }

    const pebbleSpots: [number, number][] = [
      [260, 620], [980, 1080], [1450, 500],
    ];
    for (const [x, y] of pebbleSpots) {
      this.add.image(x, y, "pebble").setDepth(0.1);
    }

    const butterflySpots: [number, number][] = [[200, 200], [700, 180], [340, 1250]];
    butterflySpots.forEach(([x, y], i) => new Critter(this, x, y, "butterfly", i % 2));

    const rabbitSpots: [number, number][] = [[160, 850], [1300, 1230], [1380, 850]];
    rabbitSpots.forEach(([x, y]) => new Critter(this, x, y, "rabbit"));
  }

  update(_time: number, delta: number): void {
    this.player.update(delta, this.touchInput.moveVector);

    for (const node of this.nodes) {
      const result = node.update(delta);
      if (result) {
        this.grantXp(node.config.skill, result.xp, true);
        this.inventory.add(result.item, result.quantity);
      }
    }
    this.dummy.update(delta);

    for (const npc of this.npcs) {
      if (npc.config.questId) {
        npc.setQuestMarkerVisible(this.quests.getState(npc.config.questId) === "available");
      }
    }

    this.updateInteraction();

    this.autosaveAccum += delta;
    if (this.autosaveAccum > 5000) {
      this.autosaveAccum = 0;
      this.saveNow();
    }
  }

  /** Applies the tool (gather-only) and accessory (all-skill) XP bonuses from equipped gear. */
  private grantXp(skillId: SkillId, baseXp: number, isGather: boolean): void {
    const stats = this.equipment.getStats();
    const bonusPct = stats.allXpBonusPct + (isGather ? stats.gatherXpBonusPct : 0);
    this.skills.addXp(skillId, Math.round(baseXp * (1 + bonusPct / 100)));
  }

  private updateInteraction(): void {
    const px = this.player.x;
    const py = this.player.y;

    let closest: Interactable | null = null;
    let closestDist = Infinity;

    for (const node of this.nodes) {
      const d = node.distanceTo(px, py);
      if (d <= node.config.interactionRadius && d < closestDist) {
        closest = node;
        closestDist = d;
      }
    }
    const dummyDist = this.dummy.distanceTo(px, py);
    if (dummyDist <= 46 && dummyDist < closestDist) {
      closest = this.dummy;
      closestDist = dummyDist;
    }
    for (const station of this.stations) {
      const d = station.distanceTo(px, py);
      if (d <= 50 && d < closestDist) {
        closest = station;
        closestDist = d;
      }
    }
    for (const npc of this.npcs) {
      const d = npc.distanceTo(px, py);
      if (d <= 48 && d < closestDist) {
        closest = npc;
        closestDist = d;
      }
    }

    this.events.emit("interactTarget", this.describeTarget(closest));

    const pressedE =
      Phaser.Input.Keyboard.JustDown(this.keyE) || this.touchInput.consumeInteract();
    if (pressedE && closest && !this.player.isLocked()) {
      if (closest instanceof ResourceNode) {
        if (closest.tryStartAction()) {
          this.player.faceToward(closest.x, closest.y);
          this.player.lockForAction(closest.config.actionDurationMs, "gather");
        }
      } else if (closest instanceof TrainingDummy) {
        const xp = closest.attack(this.equipment.getStats().attack);
        if (xp) {
          this.grantXp("combat", xp, false);
          this.player.faceToward(closest.x, closest.y);
          this.player.lockForAction(300, "attack");
        }
      } else if (closest instanceof CraftingStation) {
        this.events.emit("openCrafting", closest.skills, closest.label);
      } else if (closest instanceof Npc) {
        // An unfinished quest takes priority over the shop so it's never
        // permanently hidden behind a shopkeeper who also gives one.
        if (closest.config.questId && this.quests.getState(closest.config.questId) === "available") {
          this.events.emit("openQuest", closest.config.questId, closest.config.name);
        } else if (closest.config.shopId) {
          this.events.emit("openShop", closest.config.shopId, closest.config.name);
        } else if (closest.config.questId) {
          this.events.emit("openQuest", closest.config.questId, closest.config.name);
        }
      }
    }
  }

  private describeTarget(target: Interactable | null): string | null {
    if (!target) return null;
    if (target instanceof ResourceNode) {
      if (target.isDepleted()) return `${target.config.label} (depleted)`;
      return `Press E to gather ${target.config.label}`;
    }
    if (target instanceof TrainingDummy) {
      return target.isDefeated()
        ? "Training Dummy (recovering)"
        : "Press E to attack Training Dummy";
    }
    if (target instanceof CraftingStation) {
      return `Press E to use ${target.label}`;
    }
    if (target instanceof Npc) {
      if (target.config.questId && this.quests.getState(target.config.questId) === "available") {
        return `Press E to talk to ${target.config.name}`;
      }
      if (target.config.shopId) return `Press E to shop with ${target.config.name}`;
      if (target.config.questId) return `Press E to talk to ${target.config.name}`;
      return target.config.name;
    }
    return null;
  }

  private saveNow(): void {
    writeSave({
      skills: this.skills.serialize(),
      inventory: this.inventory.serialize(),
      playerX: this.player.x,
      playerY: this.player.y,
      gold: this.economy.serialize(),
      equipment: this.equipment.serialize(),
      completedQuests: this.quests.serialize(),
    });
  }
}
