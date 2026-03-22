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
}

export interface DropLoot {
  items: number[];
  chances: number[];
  counts: number[];
}
