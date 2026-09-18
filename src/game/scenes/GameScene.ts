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
import { SHOPS } from "../data/shops";
import { loadSave, writeSave } from "../systems/SaveSystem";

const WORLD_WIDTH = 2100;
const WORLD_HEIGHT = 1440;
const INTERACT_KEY = Phaser.Input.Keyboard.KeyCodes.E;

// A shop's interior lives far outside the walkable overworld; it's only
// ever reached by teleport, and the physics/camera bounds are swapped to
// just this rectangle while the player is inside, so there's no risk of
// bleed-through or of walking there normally.
const INTERIOR_X = 6000;
const INTERIOR_Y = 6000;
const ROOM_WIDTH = 260;
const ROOM_HEIGHT = 180;

interface BuildingDoor {
  kind: "door";
  x: number;
  y: number;
  shopId: string;
  label: string;
  returnX: number;
  returnY: number;
}

type Interactable = ResourceNode | TrainingDummy | CraftingStation | Npc | BuildingDoor;

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
  private doors: BuildingDoor[] = [];
  private buildingColliders: Phaser.GameObjects.Image[] = [];
  private interiorSprite!: Phaser.GameObjects.Image;
  private insideShopId: string | null = null;
  private outsideReturn = new Phaser.Math.Vector2();
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
    // A save captured while inside a shop stores the far-away interior
    // stage coordinates; spawning there on a fresh load would strand the
    // player, so fall back to the default outside spawn instead.
    const wasIndoors = save && save.playerX >= WORLD_WIDTH;
    const spawnX = wasIndoors || !save ? WORLD_WIDTH / 2 : save.playerX;
    const spawnY = wasIndoors || !save ? WORLD_HEIGHT / 2 : save.playerY;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "grass")
      .setOrigin(0, 0);

    this.buildWorld();

    this.player = new Player(this, spawnX, spawnY);

    this.interiorSprite = this.add
      .image(INTERIOR_X, INTERIOR_Y, "interior-generalStore")
      .setVisible(false);

    for (const node of this.nodes) {
      if (node.isSolid()) this.physics.add.collider(this.player, node);
    }
    for (const npc of this.npcs) {
      if (npc.body) this.physics.add.collider(this.player, npc);
    }
    for (const building of this.buildingColliders) {
      this.physics.add.collider(this.player, building);
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
    this.add.image(1750, 380, "dirt-plaza").setDepth(0.05);

    interface ShopBuildingDef {
      x: number;
      y: number;
      height: number;
      textureKey: string;
      shopId: string;
      npcId: string;
      npcName: string;
      questId?: string;
      collision: { width: number; height: number };
    }
    const shopBuildings: ShopBuildingDef[] = [
      {
        x: 1620,
        y: 260,
        height: 100,
        textureKey: "building-generalStore",
        shopId: "generalStore",
        npcId: "generalStore",
        npcName: "Mira",
        collision: { width: 90, height: 50 },
      },
      {
        x: 1900,
        y: 260,
        height: 108,
        textureKey: "building-blacksmith",
        shopId: "blacksmith",
        npcId: "blacksmith",
        npcName: "Doran",
        questId: "blacksmithOre",
        collision: { width: 92, height: 56 },
      },
      {
        x: 1620,
        y: 520,
        height: 100,
        textureKey: "building-carpenter",
        shopId: "carpenter",
        npcId: "carpenter",
        npcName: "Wren",
        questId: "carpenterLogs",
        collision: { width: 90, height: 50 },
      },
      {
        x: 1900,
        y: 520,
        height: 140,
        textureKey: "building-magicShop",
        shopId: "magicShop",
        npcId: "magicShop",
        npcName: "Ilyara",
        collision: { width: 66, height: 80 },
      },
    ];

    for (const b of shopBuildings) {
      const sprite = this.add.image(b.x, b.y, b.textureKey).setDepth(0.4);
      this.physics.add.existing(sprite, true);
      (sprite.body as Phaser.Physics.Arcade.StaticBody).setSize(b.collision.width, b.collision.height);
      this.buildingColliders.push(sprite);

      const doorY = b.y + b.height / 2 - 8;
      this.doors.push({
        kind: "door",
        x: b.x,
        y: doorY,
        shopId: b.shopId,
        label: SHOPS[b.shopId]?.name ?? b.shopId,
        returnX: b.x,
        returnY: doorY + 26,
      });

      // Stood beside the door rather than directly in front of it, so
      // walking straight toward the door to go inside doesn't pass through
      // (and get outprioritized by) the shopkeeper's own interact radius.
      this.npcs.push(
        new Npc(this, b.x + 48, doorY + 18, {
          id: b.npcId,
          name: b.npcName,
          textureKey: `npc-${b.npcId}`,
          shopId: b.shopId,
          questId: b.questId,
        }),
      );
    }

    this.add.image(1590, 1030, "dock").setOrigin(0, 0.5).setDepth(0.15);
    this.add.image(1610, 1015, "boat").setDepth(0.16);
    this.add.image(1660, 1040, "boat").setScale(0.85).setDepth(0.16);

    this.npcs.push(
      new Npc(this, 1560, 990, {
        id: "harborMaster",
        name: "Captain Voss",
        textureKey: "npc-harborMaster",
        questId: "harborFish",
      }),
    );

    const villagerSpots: [number, number, string][] = [
      [1740, 400, "villager1"],
      [1790, 440, "villager2"],
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
    const pressedE =
      Phaser.Input.Keyboard.JustDown(this.keyE) || this.touchInput.consumeInteract();

    if (this.insideShopId) {
      this.events.emit("interactTarget", "Press E to exit");
      if (pressedE) this.exitBuilding();
      return;
    }

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
    for (const door of this.doors) {
      const d = Phaser.Math.Distance.Between(door.x, door.y, px, py);
      if (d <= 40 && d < closestDist) {
        closest = door;
        closestDist = d;
      }
    }

    this.events.emit("interactTarget", this.describeTarget(closest));

    if (pressedE && closest && !this.player.isLocked()) {
      if ("kind" in closest && closest.kind === "door") {
        this.enterBuilding(closest);
      } else if (closest instanceof ResourceNode) {
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
    if ("kind" in target && target.kind === "door") {
      return `Press E to enter ${target.label}`;
    }
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

  private enterBuilding(door: BuildingDoor): void {
    this.insideShopId = door.shopId;
    this.outsideReturn.set(door.returnX, door.returnY);

    this.interiorSprite.setTexture(`interior-${door.shopId}`).setVisible(true);

    // Body.reset() clamps immediately against the world's CURRENT bounds
    // (via checkWorldBounds()), so the bounds must already be the room's
    // before we reposition the player — otherwise reset() clamps against
    // the bounds we're about to replace.
    const bx = INTERIOR_X - ROOM_WIDTH / 2;
    const by = INTERIOR_Y - ROOM_HEIGHT / 2;
    this.physics.world.setBounds(bx, by, ROOM_WIDTH, ROOM_HEIGHT);
    this.cameras.main.setBounds(bx, by, ROOM_WIDTH, ROOM_HEIGHT);

    const spawnX = INTERIOR_X;
    const spawnY = INTERIOR_Y + ROOM_HEIGHT / 2 - 40;
    this.player.setPosition(spawnX, spawnY);
    (this.player.body as Phaser.Physics.Arcade.Body).reset(spawnX, spawnY);
  }

  private exitBuilding(): void {
    this.insideShopId = null;
    this.interiorSprite.setVisible(false);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.player.setPosition(this.outsideReturn.x, this.outsideReturn.y);
    (this.player.body as Phaser.Physics.Arcade.Body).reset(this.outsideReturn.x, this.outsideReturn.y);
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
