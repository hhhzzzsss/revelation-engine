import { useQuery } from '@tanstack/react-query';
import type { FuserParameters, Item, Recipe } from './types';
import fuserParamUrl from '../assets/fuser_params.json?url';
import itemDataUrl from '../assets/item_data.json?url';
import { useCallback, useEffect, useMemo } from 'react';
import { useFavoriteRecipesStore } from '../stores';

export const useFuserParameters = () => {
  return useQuery({
    queryKey: ['fuserParameters'],
    queryFn: async () => {
      const response = await fetch(fuserParamUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch fuser parameters');
      }
      return await response.json() as FuserParameters;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

export const useItemData = () => {
  return useQuery({
    queryKey: ['itemData'],
    queryFn: async () => {
      const response = await fetch(itemDataUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch item data');
      }
      return await response.json() as Item[];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

export const useFavoriteRecipes = () => {
  const { data: itemData } = useItemData();
  const itemMap = useMemo(() => {
    if (!itemData) return undefined;
    const map: Record<number, Item> = {};
    for (const item of itemData) {
      map[item.id] = item;
    }
    return map;
  }, [itemData]);

  const { serializedRecipes, setSerializedRecipes } = useFavoriteRecipesStore();
  const serializedRecipesSet = useMemo(() => new Set(serializedRecipes), [serializedRecipes]);

  const readFromLocalStorage = useCallback(() => {
    if (!itemMap) return;
    const localStorageRecipes = localStorage.getItem('favoriteRecipes');
    if (localStorageRecipes) {
      try {
        const parsed: string[] = JSON.parse(localStorageRecipes) as string[];
        setSerializedRecipes(parsed);
      } catch (e) {
        console.error('Failed to parse favorite recipes from localStorage', e);
      }
    }
  }, [itemMap, setSerializedRecipes]);

  const serializeRecipe = useCallback((recipe: Recipe): string => {
    const inputPart = recipe.inputs
      .sort((a, b) => a.item.id - b.item.id || a.count - b.count)
      .map((qItem) => `${qItem.item.id}:${qItem.count}`)
      .join(',');
    return `${inputPart};${recipe.output.item.id}:${recipe.output.count}`;
  }, []);

  const deserializeRecipe = useCallback((serializedRecipe: string): Recipe | null => {
    if (!itemMap) return null;

    const [inputPart, outputPart] = serializedRecipe.split(';');
    const inputs = inputPart.split(',').map((part) => {
      const [itemIdStr, countStr] = part.split(':');
      return { item: itemMap[parseInt(itemIdStr)], count: parseInt(countStr) };
    });

    const [outputItemIdStr, outputCountStr] = outputPart.split(':');
    const output = { item: itemMap[parseInt(outputItemIdStr)], count: parseInt(outputCountStr) };

    return { inputs, output };
  }, [itemMap]);

  const setSerializedRecipesAndLocalStorage = useCallback((serializedRecipes: string[]) => {
    setSerializedRecipes(serializedRecipes);
    localStorage.setItem('favoriteRecipes', JSON.stringify(serializedRecipes));
  }, [setSerializedRecipes]);

  // Load initial recipes from localStorage
  useEffect(() => {
    readFromLocalStorage();
  }, [itemData, readFromLocalStorage]);

  // Parse serialized recipes
  const favoriteRecipes = useMemo(() => {
    if (!itemMap) return undefined;
    return serializedRecipes.map((str) => {
      try {
        const recipe = deserializeRecipe(str);
        if (!recipe) throw new Error(`Failed to deserialize recipe: ${str}`);
        return recipe;
      } catch (e) {
        console.error(e);
        return null;
      }
    }).filter((r) => !!r);
  }, [itemMap, serializedRecipes, deserializeRecipe]);

  const toggleFavoriteRecipe = useCallback((recipe: Recipe) => {
    const serialized = serializeRecipe(recipe);
    if (serializedRecipes.includes(serialized)) {
      setSerializedRecipesAndLocalStorage(serializedRecipes.filter((r) => r !== serialized));
    } else {
      setSerializedRecipesAndLocalStorage([...serializedRecipes, serialized]);
    }
  }, [serializedRecipes, serializeRecipe, setSerializedRecipesAndLocalStorage]);

  const isFavoriteRecipe = useCallback((recipe: Recipe): boolean => {
    const serialized = serializeRecipe(recipe);
    return serializedRecipesSet.has(serialized);
  }, [serializedRecipesSet, serializeRecipe]);

  return { favoriteRecipes, toggleFavoriteRecipe, isFavoriteRecipe };
};