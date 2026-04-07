import { useState } from 'react';
import RecipeList from '../RecipeList';
import Input from '../Input';
import { compareInputsBySearchTerm, compareItemsBySearchTerm, inputsMatchSearchTerm, itemMatchesSearchTerm } from '../../item/util';
import { useFavoriteRecipes } from '../../item/hooks';
import type { Recipe } from '../../item/types';

function FavoriteView() {
  const { favoriteRecipes } = useFavoriteRecipes();
  const [searchTerm, setSearchTerm] = useState('');

  if (!favoriteRecipes) {
    return <div className="font-pixel text-2xl">Loading...</div>;
  }

  const hasSearchTerm = searchTerm.trim().length > 0;

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

export default FavoriteView;
