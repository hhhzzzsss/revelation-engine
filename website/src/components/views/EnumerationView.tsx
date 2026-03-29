import { useEffect, useRef, useState } from 'react';
import type { Recipe } from '../../item/types';
import InventoryPicker from '../InventoryPicker';
import { useApotheosisBatchSolver } from '../../algorithm/hooks';
import { useEnumerationStore } from '../../stores';
import Button from '../Button';
import Slot from '../Slot';
import Input from '../Input';
import { itemMatchesSearchTerm } from '../../item/util';
import { useVirtualizer } from '@tanstack/react-virtual';

type Intensity = 'low' | 'medium' | 'high';

function EnumerationView() {
  const batchSolver = useApotheosisBatchSolver();

  const { items, setItems, recipes, setRecipes } = useEnumerationStore();
  const itemsRef = useRef(items);

  const [effort, setEffort] = useState<Intensity>('medium');
  const targetCountRef = useRef<number>(65536);
  
  const [isEnumerating, setIsEnumerating] = useState(false);
  const [progressDisplay, setProgressDisplay] = useState('');

  const canEnumerate = batchSolver && items.length > 1 && !isEnumerating;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    targetCountRef.current = effort === 'low' ? 4096 : effort === 'medium' ? 65536 : 262144;
  }, [effort]);

  useEffect(() => {
    if (!batchSolver || !isEnumerating || itemsRef.current.length < 2) return;

    const cancelEnumeration = batchSolver.enumerateFusions(itemsRef.current, targetCountRef.current, (message) => {
      if (message.error) {
        console.error(message.error);
        setIsEnumerating(false);
        return;
      }
      if (message.done) {
        setIsEnumerating(false);
      }

      setRecipes(message.recipes ?? []);
      setProgressDisplay(`${message.count} recipes checked (${Math.round(message.progress * 100)})%`);
    });

    return () => {
      cancelEnumeration();
    };
  }, [batchSolver, isEnumerating, setRecipes]);

  return (
    <>
      <h1 className="text-4xl font-pixel mb-4">Enumeration</h1>
      <h2 className="text-2xl font-pixel mb-2">Available Items</h2>
      <InventoryPicker className="mb-2" items={items} onItemsChange={setItems} />

      <div className="my-4">
        <div className="mb-2 flex items-center space-x-2">
          <span className="font-pixel">effort: </span>
          {['low', 'medium', 'high'].map((level) => (
            <Button
              key={level}
              className={`${effort === level ? 'bg-primary-600' : 'bg-secondary-700 text-fg-600 opacity-60 hover:opacity-100'} font-pixel`}
              onClick={() => setEffort(level as Intensity)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </div>
        <Button
          className="mb-2 bg-primary-600 hover:bg-primary-500"
          onClick={() => setIsEnumerating(true)}
          disabled={!canEnumerate}
        >
          {isEnumerating ? 'Enumerating...' : 'Enumerate!'}
        </Button>
        <span className="ml-4 font-pixel text-fg-600">
          {progressDisplay}
        </span>
      </div>
      
      <RecipeList recipes={recipes} />
    </>
  );
}

function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const filteredRecipes = recipes
    .filter((recipe) => itemMatchesSearchTerm(searchTerm, recipe.output.item))
    .toSorted((a, b) => a.output.item.id - b.output.item.id);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredRecipes.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 80,
  });

  return (
    <>
      <h2 className="text-2xl font-pixel mb-2">Recipes</h2>
      <Input
        className="w-full mb-2"
        placeholder="search by output item"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
      />
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
                key={recipe.output.item.id}
                className="absolute top-0 right-0 min-w-0"
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                <RecipeDisplay key={virtualItem.index} recipe={recipe} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="h-12" />
    </>
  );
}

function RecipeDisplay({ recipe }: { recipe: Recipe }) {
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
}

export default EnumerationView;