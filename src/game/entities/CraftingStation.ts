import Phaser from "phaser";
import type { SkillId } from "../data/skills";

/** A stationary interactable that opens the crafting panel for its skill(s) when nearby. */
export class CraftingStation extends Phaser.GameObjects.Container {
  readonly skills: SkillId[];
  readonly label: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    skills: SkillId[],
    label: string,
  ) {
    super(scene, x, y);
    this.skills = skills;
    this.label = label;
    scene.add.existing(this);

    const sprite = scene.add.sprite(0, 0, textureKey);
    this.add(sprite);
    scene.physics.add.existing(this, true);
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.x, this.y, x, y);
  }
}
