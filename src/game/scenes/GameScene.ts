import Phaser from "phaser";
import { Player } from "../entities/Player";
import { ResourceNode, type ResourceNodeConfig } from "../entities/ResourceNode";
import { TrainingDummy } from "../entities/TrainingDummy";
import { CraftingStation } from "../entities/CraftingStation";
import type { SkillSystem } from "../systems/SkillSystem";
import type { InventorySystem } from "../systems/InventorySystem";
import { loadSave, writeSave } from "../systems/SaveSystem";

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1440;
const INTERACT_KEY = Phaser.Input.Keyboard.KeyCodes.E;

type Interactable = ResourceNode | TrainingDummy | CraftingStation;

export class GameScene extends Phaser.Scene {
  private skills!: SkillSystem;
  private inventory!: InventorySystem;
  private player!: Player;
  private nodes: ResourceNode[] = [];
  private dummy!: TrainingDummy;
  private stations: CraftingStation[] = [];
  private keyE!: Phaser.Input.Keyboard.Key;
  private autosaveAccum = 0;

  constructor() {
    super("Game");
  }

  create(): void {
    this.skills = this.game.registry.get("skills");
    this.inventory = this.game.registry.get("inventory");

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
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);

    for (const node of this.nodes) {
      const result = node.update(delta);
      if (result) {
        this.skills.addXp(node.config.skill, result.xp);
        this.inventory.add(result.item, result.quantity);
      }
    }
    this.dummy.update(delta);

    this.updateInteraction();

    this.autosaveAccum += delta;
    if (this.autosaveAccum > 5000) {
      this.autosaveAccum = 0;
      this.saveNow();
    }
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

    this.events.emit("interactTarget", this.describeTarget(closest));

    const pressedE = Phaser.Input.Keyboard.JustDown(this.keyE);
    if (pressedE && closest) {
      if (closest instanceof ResourceNode) {
        closest.tryStartAction();
      } else if (closest instanceof TrainingDummy) {
        const xp = closest.attack();
        if (xp) this.skills.addXp("combat", xp);
      } else if (closest instanceof CraftingStation) {
        this.events.emit("openCrafting", closest.skills, closest.label);
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
    return null;
  }

  private saveNow(): void {
    writeSave({
      skills: this.skills.serialize(),
      inventory: this.inventory.serialize(),
      playerX: this.player.x,
      playerY: this.player.y,
    });
  }
}
