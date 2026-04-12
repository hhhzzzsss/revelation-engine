import type { QuantifiedItem, Recipe } from '../item/types';
import { capRecipeOutput, serializeRecipe } from '../item/util';
import { compareInputCount, compareInputEnergy, compareQualityHeuristic } from './util';

export abstract class Aggregator {
  public abstract addRecipe(recipe: Recipe): void;
  public abstract getRecipes(): Recipe[];
}

export class CompositeAggregator extends Aggregator {
  private aggregators: Aggregator[];

  constructor(...aggregators: Aggregator[]) {
    super();
    this.aggregators = aggregators;
  }

  public addRecipe(recipe: Recipe) {
    for (const aggregator of this.aggregators) {
      aggregator.addRecipe(recipe);
    }
  }

  public getRecipes(): Recipe[] {
    const recipeMap = new Map<string, Recipe>();
    for (const aggregator of this.aggregators) {
      for (const recipe of aggregator.getRecipes()) {
        const serializedRecipe = serializeRecipe(recipe);
        recipeMap.set(serializedRecipe, recipe);
      }
    }
    return Array.from(recipeMap.values());
  }
}

export abstract class EnumerationAggregator extends Aggregator {
  private maxStackSize: number;
  private recipeMap = new Map<number, Recipe>();

  constructor({ maxStackSize }: { maxStackSize: number }) {
    super();
    this.maxStackSize = maxStackSize;
  }

  protected abstract compareRecipes(recipeA: Recipe, recipeB: Recipe): number;

  private compareRecipesCapped(recipeA: Recipe, recipeB: Recipe): number {
    return this.compareRecipes(
      capRecipeOutput(recipeA, this.maxStackSize),
      capRecipeOutput(recipeB, this.maxStackSize),
    );
  }

  public addRecipe(recipe: Recipe) {
    const outputId = recipe.output.item.id;
    const existingRecipe = this.recipeMap.get(outputId);
    if (!existingRecipe) {
      this.recipeMap.set(outputId, recipe);
    } else {
      const comparison = this.compareRecipesCapped(recipe, existingRecipe);
      if (comparison < 0) {
        this.recipeMap.set(outputId, recipe);
      }
    }
  }

  public getRecipes(): Recipe[] {
    return Array.from(this.recipeMap.values());
  }
}

export class QualityHeuristicEnumerationAggregator extends EnumerationAggregator {
  protected compareRecipes(recipeA: Recipe, recipeB: Recipe): number {
    return -compareQualityHeuristic(recipeA, recipeB);
  }
}

export class InputCountEnumerationAggregator extends EnumerationAggregator {
  protected compareRecipes(recipeA: Recipe, recipeB: Recipe): number {
    return compareInputCount(recipeA, recipeB) || compareInputEnergy(recipeA, recipeB);
  }
}

export abstract class DerivationAggregator extends Aggregator {
  private maxStackSize: number;
  private maxResults: number;
  private recipeMap = new Map<string, Recipe>();
  private worstKey: string | null = null;
  private worstRecipe: Recipe | null = null;
  private isWorstDirty = true;
  
  constructor({ maxStackSize, maxResults = 256 }: { maxStackSize: number; maxResults?: number }) {
    super();
    this.maxResults = maxResults;
    this.maxStackSize = maxStackSize;
  }

  protected abstract compareRecipes(recipeA: Recipe, recipeB: Recipe): number;

  private compareRecipesCapped(recipeA: Recipe, recipeB: Recipe): number {
    return this.compareRecipes(
      capRecipeOutput(recipeA, this.maxStackSize),
      capRecipeOutput(recipeB, this.maxStackSize),
    );
  }

  public addRecipe(recipe: Recipe) {
    const key = this.getKey(recipe.inputs);
    const existingRecipe = this.recipeMap.get(key);

    if (existingRecipe) {
      const comparison = this.compareRecipesCapped(recipe, existingRecipe);
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
      if (this.worstRecipe && this.compareRecipesCapped(recipe, this.worstRecipe) >= 0) {
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
    if (!this.worstRecipe || this.compareRecipesCapped(recipe, this.worstRecipe) > 0) {
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
      if (!this.worstRecipe || this.compareRecipesCapped(recipe, this.worstRecipe) > 0) {
        this.worstKey = key;
        this.worstRecipe = recipe;
      }
    }
    this.isWorstDirty = false;
  };
}

export class QualityHeuristicDerivationAggregator extends DerivationAggregator {
  protected compareRecipes(recipeA: Recipe, recipeB: Recipe): number {
    return -compareQualityHeuristic(recipeA, recipeB);
  }
}

export class InputCountDerivationAggregator extends DerivationAggregator {
  protected compareRecipes(recipeA: Recipe, recipeB: Recipe): number {
    return compareInputCount(recipeA, recipeB) || compareInputEnergy(recipeA, recipeB);
  }
}
