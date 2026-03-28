import type { Item } from './types';

export const itemMatchesSearchTerm = (searchTerm: string, item?: Item): boolean => {
  if (!item) return false;
  return item.display_name.toLowerCase().includes(searchTerm.toLowerCase());
};

export const compareItemsBySearchTerm = (searchTerm: string, a: Item, b: Item, alphabetical=true): number => {
  const posA = a.display_name.toLowerCase().indexOf(searchTerm.toLowerCase());
  const posB = b.display_name.toLowerCase().indexOf(searchTerm.toLowerCase());

  if (posA !== posB) {
    if (posA === -1) return 1;
    if (posB === -1) return -1;
    return posA - posB;
  }
  
  if (alphabetical) {
    return a.display_name.localeCompare(b.display_name);
  } else {
    return a.id - b.id;
  }
};
