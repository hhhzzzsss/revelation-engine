import type { Recipe } from '../item/types';

export const getEnergyRatio = (recipe: Recipe): number => {
  return recipe.output.item.essence.energy * recipe.output.count / recipe.inputs.reduce((sum, input) => sum + input.item.essence.energy * input.count, 0.0001);
};

export const compareEnergyRatio = (recipeA: Recipe, recipeB: Recipe): number => {
  const ratioA = getEnergyRatio(recipeA);
  const ratioB = getEnergyRatio(recipeB);
  return ratioA - ratioB;
};
