import "./style.css";
import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { GameScene } from "./game/scenes/GameScene";
import { UIScene } from "./game/scenes/UIScene";
import { SkillSystem } from "./game/systems/SkillSystem";
import { InventorySystem } from "./game/systems/InventorySystem";
import { loadSave } from "./game/systems/SaveSystem";

const save = loadSave();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 640,
  backgroundColor: "#1c1c24",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

game.registry.set("skills", new SkillSystem(save?.skills));
game.registry.set("inventory", new InventorySystem(save?.inventory));
