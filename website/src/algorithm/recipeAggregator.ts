import type { QuantifiedItem, Recipe } from '../item/types';
import { compareEnergyRatio } from './util';

export abstract class EnumerationAggregator {
  protected recipeMap = new Map<number, Recipe>();

  protected abstract compareRecipes(recipeA: Recipe, recipeB: Recipe): number;

  public addRecipe(recipe: Recipe) {
    const outputId = recipe.output.item.id;
    const existingRecipe = this.recipeMap.get(outputId);
    if (!existingRecipe) {
      this.recipeMap.set(outputId, recipe);
    } else {
      const comparison = this.compareRecipes(recipe, existingRecipe);
      if (comparison < 0) {
        this.recipeMap.set(outputId, recipe);
      }
    }
  }

  public getRecipes(): Recipe[] {
    return Array.from(this.recipeMap.values());
  }
}

export class EnergyRatioEnumerationAggregator extends EnumerationAggregator {
  protected compareRecipes(recipeA: Recipe, recipeB: Recipe): number {
    return -compareEnergyRatio(recipeA, recipeB);
  }
}

export abstract class DerivationAggregator {
  private recipeMap = new Map<string, Recipe>();
  
  protected abstract compareRecipes(recipeA: Recipe, recipeB: Recipe): number;

  public addRecipe(recipe: Recipe) {
    const key = this.getKey(recipe.inputs);
    const existingRecipe = this.recipeMap.get(key);
    if (!existingRecipe) {
      this.recipeMap.set(key, recipe);
    } else {
      const comparison = this.compareRecipes(recipe, existingRecipe);
      if (comparison < 0) {
        this.recipeMap.set(key, recipe);
      }
    }
  }

  public getRecipes(): Recipe[] {
    return Array.from(this.recipeMap.values());
  }

  // Based on the set of input item IDs, ignoring counts.
  private getKey = (input: QuantifiedItem[]): string => {
    const idSet = new Set(input.map((qItem) => qItem.item.id));
    const sortedIds = Array.from(idSet).sort((a, b) => a - b);
    return sortedIds.map((id) => id.toString(16)).join(',');
  };
}

export class EnergyRatioDerivationAggregator extends DerivationAggregator {
  protected compareRecipes(recipeA: Recipe, recipeB: Recipe): number {
    return -compareEnergyRatio(recipeA, recipeB);
  }
}
