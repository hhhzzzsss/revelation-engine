import type { Recipe } from './types';

export abstract class RecipeAggregator {
  protected recipeMap = new Map<number, Recipe>();

  protected abstract compareRecipes(recipeA: Recipe, recipeB: Recipe): number;

  public addRecipe(recipe: Recipe) {
    const outputId = recipe.output.item.id;
    const existingRecipe = this.recipeMap.get(outputId);
    if (!existingRecipe) {
      this.recipeMap.set(outputId, recipe);
    } else {
      const comparison = this.compareRecipes(recipe, existingRecipe);
      if (comparison > 0) {
        this.recipeMap.set(outputId, recipe);
      }
    }
  }

  public getRecipes(): Recipe[] {
    return Array.from(this.recipeMap.values());
  }
}

export class EnergyRatioRecipeAggregator extends RecipeAggregator {
  protected compareRecipes(recipeA: Recipe, recipeB: Recipe): number {
    const ratioA = recipeA.output.item.essence.energy / recipeA.inputs.reduce((sum, input) => sum + input.item.essence.energy * input.count, 0.0001);
    const ratioB = recipeB.output.item.essence.energy / recipeB.inputs.reduce((sum, input) => sum + input.item.essence.energy * input.count, 0.0001);
    return ratioA - ratioB;
  }
}
