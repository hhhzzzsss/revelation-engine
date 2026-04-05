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
  private maxResults: number;
  private recipeMap = new Map<string, Recipe>();
  private worstKey: string | null = null;
  private worstRecipe: Recipe | null = null;
  private isWorstDirty = true;
  
  protected abstract compareRecipes(recipeA: Recipe, recipeB: Recipe): number;

  constructor(maxResults: number = 256) {
    this.maxResults = maxResults;
  }

  public addRecipe(recipe: Recipe) {
    const key = this.getKey(recipe.inputs);
    const existingRecipe = this.recipeMap.get(key);

    if (existingRecipe) {
      const comparison = this.compareRecipes(recipe, existingRecipe);
      if (comparison < 0) {
        this.recipeMap.set(key, recipe);
        if (this.worstKey === key) {
          this.isWorstDirty = true;
        }
      }
      return;
    }

    this.refreshWorstIfNeeded();

    if (this.recipeMap.size >= this.maxResults) {
      // If the new recipe is worse than or equal to the worst recipe, skip it.
      if (this.worstRecipe && this.compareRecipes(recipe, this.worstRecipe) >= 0) {
        return;
      }

      // Otherwise, remove the worst recipe to make room for the new one.
      if (this.worstKey) {
        this.recipeMap.delete(this.worstKey);
        this.worstKey = null;
        this.worstRecipe = null;
        this.isWorstDirty = true;
      }
    }

    this.recipeMap.set(key, recipe);
    if (!this.worstRecipe || this.compareRecipes(recipe, this.worstRecipe) > 0) {
      this.worstKey = key;
      this.worstRecipe = recipe;
      this.isWorstDirty = false;
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

  private refreshWorstIfNeeded = () => {
    if (!this.isWorstDirty) return;

    this.worstKey = null;
    this.worstRecipe = null;
    for (const [key, recipe] of this.recipeMap) {
      if (!this.worstRecipe || this.compareRecipes(recipe, this.worstRecipe) > 0) {
        this.worstKey = key;
        this.worstRecipe = recipe;
      }
    }
    this.isWorstDirty = false;
  };
}

export class EnergyRatioDerivationAggregator extends DerivationAggregator {
  protected compareRecipes(recipeA: Recipe, recipeB: Recipe): number {
    return -compareEnergyRatio(recipeA, recipeB);
  }
}
