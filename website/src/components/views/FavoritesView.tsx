import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import RecipeList from '../RecipeList';
import Input from '../Input';
import {
  compareInputsBySearchTerm,
  compareItemsBySearchTerm,
  inputsMatchSearchTerm,
  itemMatchesSearchTerm,
  serializeRecipe,
} from '../../item/util';
import { useFavoriteRecipes } from '../../item/hooks';
import type { Recipe } from '../../item/types';
import { useApotheosisSolver } from '../../algorithm/hooks';
import type ApotheosisSolver from '../../algorithm/apotheosisSolver';

function FavoriteView() {
  const { favoriteRecipes } = useFavoriteRecipes();
  const [searchTerm, setSearchTerm] = useState('');
  const solver = useApotheosisSolver();

  const [cacheStore] = useState(() => new RecipeValidityCacheStore());

  const recipeValidityCache = useSyncExternalStore(cacheStore.subscribe, cacheStore.getSnapshot);

  useEffect(() => {
    cacheStore.sync(favoriteRecipes, solver ?? undefined);
  }, [cacheStore, favoriteRecipes, solver]);

  const isValidRecipe = useCallback((recipe: Recipe) => {
    const serializedRecipe = serializeRecipe(recipe);
    return recipeValidityCache.get(serializedRecipe) ?? false;
  }, [recipeValidityCache]);

  const hasSearchTerm = searchTerm.trim().length > 0;

  if (!favoriteRecipes || !solver) {
    return <div className="font-pixel text-2xl">Loading...</div>;
  }

  return (
    <div className="w-3xl flex flex-col h-full">
      <h1 className="text-4xl font-pixel mb-4">Favorites</h1>
      <Input
        className="w-full mb-2"
        placeholder="search by output or input item"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
      />
      <RecipeList
        className="h-auto flex-1"
        favoriteButtonStyle="x"
        recipes={favoriteRecipes}
        filter={(recipe) => itemMatchesSearchTerm(searchTerm, recipe.output.item) || inputsMatchSearchTerm(searchTerm, recipe)}
        comparator={(a, b) => compareFavoriteRecipes(searchTerm, hasSearchTerm, a, b)}
        validRecipeFilter={isValidRecipe}
      />
    </div>
  );
}

const compareFavoriteRecipes = (
  searchTerm: string,
  hasSearchTerm: boolean,
  a: Recipe,
  b: Recipe,
): number => {
  if (!hasSearchTerm) {
    return a.output.item.id - b.output.item.id;
  }

  const outputComparison = compareItemsBySearchTerm(searchTerm, a.output.item, b.output.item);
  if (outputComparison) return outputComparison;

  const inputComparison = compareInputsBySearchTerm(searchTerm, a, b);
  if (inputComparison) return inputComparison;

  return a.output.item.id - b.output.item.id;
};

class RecipeValidityCacheStore {
  private cache = new Map<string, boolean>();

  private listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): Map<string, boolean> => this.cache;

  sync = (favoriteRecipes?: Recipe[], solver?: ApotheosisSolver): void => {
    if (!favoriteRecipes || !solver) {
      this.cache = new Map<string, boolean>();
      this.emitChange();
      return;
    }

    const newCache = new Map<string, boolean>();

    for (const recipe of favoriteRecipes) {
      const serializedRecipe = serializeRecipe(recipe);

      if (this.cache.has(serializedRecipe)) {
        newCache.set(serializedRecipe, this.cache.get(serializedRecipe) ?? false);
      } else {
        const result = solver.fuse(recipe.inputs);
        const isValid = (
          result !== null
          && result.item.id === recipe.output.item.id
          && result.count === recipe.output.count
        );
        newCache.set(serializedRecipe, isValid);
      }
    }

    this.cache = newCache;
    this.emitChange();
  };

  private emitChange = (): void => {
    for (const listener of this.listeners) {
      listener();
    }
  };
}

export default FavoriteView;
