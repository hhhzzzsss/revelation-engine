import { memo, useRef } from 'react';
import type { Recipe } from '../item/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import Slot from './Slot';

interface RecipeListProps {
  recipes: Recipe[];
  filter?: (recipe: Recipe) => boolean;
  comparator?: (recipeA: Recipe, recipeB: Recipe) => number;
}

function RecipeList({
  recipes,
  filter = () => true,
  comparator = () => 0,
}: RecipeListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const filteredRecipes = recipes.filter(filter).toSorted(comparator);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredRecipes.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={listRef} className="max-w-full h-128 overflow-y-auto">
      {filteredRecipes.length === 0 && (
        <div className="mt-4 text-center font-pixel text-fg-600">
          no recipes found
        </div>
      )}
      <div style={{ height: rowVirtualizer.getTotalSize() }} className="relative w-lg mx-auto flex flex-col">
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const recipe = filteredRecipes[virtualItem.index];
          return (
            <div
              key={virtualItem.index}
              className="absolute top-0 right-0 min-w-0"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <RecipeDisplay recipe={recipe} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RecipeDisplayProps {
  recipe: Recipe;
}

const RecipeDisplay = memo(function RecipeDisplay({
  recipe,
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
    </div>
  );
});

export default RecipeList;
