import type { Recipe } from '../item/types';

export const getQualityHeuristic = (recipe: Recipe): number => {
  const inputEnergy = recipe.inputs.reduce((sum, input) => sum + input.item.essence.energy * input.count, 0);
  const outputEnergy = recipe.output.item.essence.energy * recipe.output.count;
  const totalQuantity = recipe.inputs.reduce((sum, input) => sum + input.count, 0) + recipe.output.count;
  const energyRatio = outputEnergy / (inputEnergy + 0.0001);
  return energyRatio + 4.0 / (totalQuantity + 8); // Main metric is energy ratio, with a small bonus for fewer total items to encourage simpler recipes
};

export const getEnergyRatio = (recipe: Recipe): number => {
  return recipe.output.item.essence.energy * recipe.output.count / recipe.inputs.reduce((sum, input) => sum + input.item.essence.energy * input.count, 0.0001);
};

export const getInputEnergy = (recipe: Recipe): number => {
  return recipe.inputs.reduce((sum, input) => sum + input.item.essence.energy * input.count, 0);
};

export const getInputCount = (recipe: Recipe): number => {
  const inputCount = recipe.inputs.reduce((sum, input) => sum + input.count, 0);
  return inputCount;
};

export const compareEnergyRatio = (recipeA: Recipe, recipeB: Recipe): number => {
  const ratioA = getEnergyRatio(recipeA);
  const ratioB = getEnergyRatio(recipeB);
  return ratioA - ratioB;
};

export const compareQualityHeuristic = (recipeA: Recipe, recipeB: Recipe): number => {
  const heuristicA = getQualityHeuristic(recipeA);
  const heuristicB = getQualityHeuristic(recipeB);
  return heuristicA - heuristicB;
};

export const compareInputEnergy = (recipeA: Recipe, recipeB: Recipe): number => {
  const energyA = getInputEnergy(recipeA);
  const energyB = getInputEnergy(recipeB);
  return energyA - energyB;
};

export const compareInputCount = (recipeA: Recipe, recipeB: Recipe): number => {
  const differenceA = getInputCount(recipeA);
  const differenceB = getInputCount(recipeB);
  return differenceA - differenceB;
};
