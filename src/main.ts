import "./style.css";
import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { GameScene } from "./game/scenes/GameScene";
import { UIScene } from "./game/scenes/UIScene";
import { SkillSystem } from "./game/systems/SkillSystem";
import { InventorySystem } from "./game/systems/InventorySystem";
import { TouchInput } from "./game/systems/TouchInput";
import { EconomySystem } from "./game/systems/EconomySystem";
import { EquipmentSystem } from "./game/systems/EquipmentSystem";
import { QuestSystem } from "./game/systems/QuestSystem";
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
  // 3 simultaneous pointers so a touch joystick drag and an interact tap
  // don't steal each other's pointer on mobile.
  input: {
    activePointers: 3,
  },
  scene: [BootScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

game.registry.set("skills", new SkillSystem(save?.skills));
game.registry.set("inventory", new InventorySystem(save?.inventory));
game.registry.set("touchInput", new TouchInput());
game.registry.set("economy", new EconomySystem(save?.gold ?? 0));
game.registry.set("equipment", new EquipmentSystem(save?.equipment));
game.registry.set("quests", new QuestSystem(save?.completedQuests));

// Handy for debugging from the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
