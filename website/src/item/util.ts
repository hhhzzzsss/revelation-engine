import type { Item, Recipe } from './types';

export const itemMatchesSearchTerm = (searchTerm: string, item?: Item): boolean => {
  if (!item) return false;
  return item.display_name.toLowerCase().includes(searchTerm.toLowerCase());
};

export const compareItemsBySearchTerm = (searchTerm: string, a: Item, b: Item): number => {
  const posA = searchTermPosition(searchTerm, a);
  const posB = searchTermPosition(searchTerm, b);
  return posA - posB;
};

export const compareItemsByDisplayName = (a: Item, b: Item): number => {
  return a.display_name.localeCompare(b.display_name);
};

export const inputsMatchSearchTerm = (searchTerm: string, recipe?: Recipe): boolean => {
  if (!recipe) return false;
  return recipe.inputs.some((input) => itemMatchesSearchTerm(searchTerm, input.item));
};

export const compareInputsBySearchTerm = (searchTerm: string, a: Recipe, b: Recipe): number => {
  const bestA = Math.min(...a.inputs.map((input) => searchTermPosition(searchTerm, input.item)));
  const bestB = Math.min(...b.inputs.map((input) => searchTermPosition(searchTerm, input.item)));
  return bestA - bestB;
};

const searchTermPosition = (searchTerm: string, Item: Item): number => {
  const pos = Item.display_name.toLowerCase().indexOf(searchTerm.toLowerCase());
  return pos === -1 ? Number.MAX_SAFE_INTEGER : pos;
};

export const serializeRecipe = (recipe: Recipe): string => {
  const inputPart = recipe.inputs
    .sort((a, b) => a.item.id - b.item.id || a.count - b.count)
    .map((qItem) => `${qItem.item.id}:${qItem.count}`)
    .join(',');
  return `${inputPart};${recipe.output.item.id}:${recipe.output.count}`;
};

export const deserializeRecipe = (str: string, itemMap: Record<number, Item>): Recipe => {
  const [inputPart, outputPart] = str.split(';');
  const inputs = inputPart.split(',').map((part) => {
    const [itemIdStr, countStr] = part.split(':');
    return { item: itemMap[parseInt(itemIdStr)], count: parseInt(countStr) };
  });
  const [outputItemIdStr, outputCountStr] = outputPart.split(':');
  const output = { item: itemMap[parseInt(outputItemIdStr)], count: parseInt(outputCountStr) };
  return { inputs, output };
};
