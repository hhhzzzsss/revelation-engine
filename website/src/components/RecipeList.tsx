import { memo, useRef } from 'react';
import type { Recipe } from '../item/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import Slot from './Slot';
import FavoriteHeartButton from './FavoriteHeartButton';
import { useFavoriteRecipes } from '../item/hooks';

interface RecipeListProps {
  className?: string;
  favoriteButtonStyle?: 'heart' | 'x';
  recipes: Recipe[];
  filter?: (recipe: Recipe) => boolean;
  comparator?: (recipeA: Recipe, recipeB: Recipe) => number;
}

function RecipeList({
  className = '',
  favoriteButtonStyle = 'heart',
  recipes,
  filter = () => true,
  comparator = () => 0,
}: RecipeListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const { isFavoriteRecipe, toggleFavoriteRecipe } = useFavoriteRecipes();

  const filteredRecipes = recipes.filter(filter).toSorted(comparator);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredRecipes.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={listRef} className={`max-w-full h-128 overflow-y-auto ${className}`}>
      {filteredRecipes.length === 0 && (
        <div className="mt-4 text-center font-pixel text-fg-600">
          no recipes found
        </div>
      )}
      <div style={{ height: rowVirtualizer.getTotalSize() }} className="relative w-2xl mx-auto flex flex-col">
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const recipe = filteredRecipes[virtualItem.index];
          return (
            <div
              key={virtualItem.index}
              className="absolute top-0 right-0 min-w-0"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <RecipeDisplay
                recipe={recipe}
                isFavorite={isFavoriteRecipe(recipe)}
                favoriteButtonStyle={favoriteButtonStyle}
                onToggleFavorite={() => toggleFavoriteRecipe(recipe)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RecipeDisplayProps {
  favoriteButtonStyle: 'heart' | 'x';
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const RecipeDisplay = memo(function RecipeDisplay({
  favoriteButtonStyle,
  recipe,
  isFavorite,
  onToggleFavorite,
}: RecipeDisplayProps) {
  return (
    <div className="flex items-center">
      {Array.from({ length: 6 - recipe.inputs.length }).map((_, index) => (
        <Slot key={index} />
      ))}
      {recipe.inputs.map((qItem, index) => (
        <Slot key={index} item={qItem.item} count={qItem.count} />
      ))}
      <div className="font-pixel text-4xl">{'>'}</div>
      <Slot item={recipe.output.item} count={recipe.output.count} />
      {favoriteButtonStyle === 'x' ? (
        <button
          className="shrink-0 ml-4 inline-block font-pixel text-xl text-severe-500 hover:text-severe-400 cursor-pointer"
          onClick={onToggleFavorite}
        >
          x
        </button>
      ) : (
        <FavoriteHeartButton
          className="shrink-0 ml-4 cursor-pointer"
          filled={isFavorite}
          onClick={onToggleFavorite}
        />
      )}
    </div>
  );
});

export default RecipeList;
