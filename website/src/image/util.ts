import type { Item } from '../item/types';

const appendBaseUrls = <T extends Record<string, string>>(paths: T): T => {
  const baseUrl = import.meta.env.BASE_URL;
  const result: Record<string, string> = {};
  for (const [key, path] of Object.entries(paths)) {
    result[key] = `${baseUrl}${path}`;
  }
  return result as T;
};

export const IMAGE_PATHS = appendBaseUrls({
  revelation_nut: 'revelation_nut.svg',
  slot: 'slot.png',
  slot_hover: 'slot_hover.png',
});

export const getIconPath = (item: Item) => {
  return `${import.meta.env.BASE_URL}icons/${item.id}.png`;
};
