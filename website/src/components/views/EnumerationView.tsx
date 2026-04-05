import { useEffect, useRef, useState } from 'react';
import type { Recipe } from '../../item/types';
import InventoryPicker from '../InventoryPicker';
import { useApotheosisBatchSolver, useProgressCallbackThrottler } from '../../algorithm/hooks';
import { useAvailableItemsStore, useEnumerationStore } from '../../stores';
import Button from '../Button';
import Input from '../Input';
import { compareItemsBySearchTerm, itemMatchesSearchTerm } from '../../item/util';
import RecipeList from '../RecipeList';
import type { ProgressMessage } from '../../algorithm/apotheosisBatchSolver';

type Effort = 'low' | 'medium' | 'high';

function EnumerationView() {
  const batchSolver = useApotheosisBatchSolver();

  const { items, setItems } = useAvailableItemsStore();
  const { recipes, setRecipes } = useEnumerationStore();
  const itemsRef = useRef(items);

  const [effort, setEffort] = useState<Effort>('medium');
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

  const progressCallbackThrottler = useProgressCallbackThrottler();

  useEffect(() => {
    if (!batchSolver || !isEnumerating || itemsRef.current.length < 2) return;

    const cancelEnumeration = batchSolver.enumerateFusions(
      itemsRef.current,
      targetCountRef.current,
      progressCallbackThrottler((message: ProgressMessage) => {
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
      }),
    );

    return () => {
      cancelEnumeration();
    };
  }, [batchSolver, isEnumerating, setRecipes, progressCallbackThrottler]);

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
              onClick={() => setEffort(level as Effort)}
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
        <Button
          className="mb-2 ml-2 bg-severe-600 hover:bg-severe-500"
          onClick={() => setIsEnumerating(false)}
          disabled={!isEnumerating}
        >
          Cancel
        </Button>
        <span className="ml-4 font-pixel text-fg-600">
          {progressDisplay}
        </span>
      </div>
      
      <SearchableRecipeList recipes={recipes} />
    </>
  );
}

function SearchableRecipeList({ recipes }: { recipes: Recipe[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <>
      <h2 className="text-2xl font-pixel mb-2">Recipes</h2>
      <Input
        className="w-full mb-2"
        placeholder="search by output item"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
      />
      <RecipeList
        recipes={recipes}
        filter={(recipe) => itemMatchesSearchTerm(searchTerm, recipe.output.item)}
        comparator={(a, b) => compareItemsBySearchTerm(searchTerm, a.output.item, b.output.item, false)}
      />
      <div className="h-12" />
    </>
  );
}

export default EnumerationView;
