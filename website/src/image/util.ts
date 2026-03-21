import type { Item } from '../item/types';

export const IMAGE_PATHS = {
  revelation_nut: '/revelation_nut.svg',
  slot: '/slot.png',
  slot_hover: '/slot_hover.png',
};

export const getIconPath = (item: Item) => {
  return `/icons/${item.id}.png`;
};
