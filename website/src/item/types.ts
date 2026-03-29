export interface FuserParameters {
  used_properties: string[]
  used_properties_weights: Record<string, number>;
  tags: string[];
  tag_magnitude: number;
  color_weight: number;
  samey_punishment: number;
}

export interface QuantifiedItem {
  item: Item;
  count: number;
}

export interface Item {
  id: number;
  internal: boolean;
  display_name: string;
  internal_name: string;
  stack_size: number;
  max_durability: number;
  color: Color;
  essence: Essence;
  block_data?: BlockData;
  tool_data?: ToolData;
}

export type Color = [number, number, number];

export interface Essence {
  energy: number;
  fuseable: boolean;
  rank: number;
  bias: number;
  tags: string[];
  output_tags: string[];
  properties: Record<string, number>;
}

export interface BlockData {
  unbreakable: boolean;
  griefable: boolean;
  flammability: number;
  sustain_fire: boolean;
  drop_item?: number;
  drop_loot?: DropLoot;
  pickaxe_affinity: boolean;
  pickaxe_required: boolean;
  meat_affinity: boolean;
  plant_affinity: boolean;
  shovel_affinity: boolean;
  axe_affinity: boolean;
  axe_required: boolean;
  break_time: number;
}

export interface DropLoot {
  items: number[];
  chances: number[];
  counts: number[];
}

export interface Recipe {
  inputs: QuantifiedItem[];
  output: QuantifiedItem;
}

export interface ToolData {
  attack_increase: number;
  axe_boost: boolean;
  pickaxe_boost: boolean;
  cristella_boost: boolean;
  slime_boost: boolean;
  plant_boost: boolean;
  meat_boost: boolean;
  shovel_boost: boolean;
  break_speed_increase: number;
  fire_aspect: boolean
}
