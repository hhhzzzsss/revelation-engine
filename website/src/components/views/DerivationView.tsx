import { useEffect, useRef, useState } from 'react';
import { useAvailableItemsStore, useDerivationStore } from '../../stores';
import { useApotheosisBatchSolver, useProgressCallbackThrottler } from '../../algorithm/hooks';
import Button from '../Button';
import InventoryPicker from '../InventoryPicker';
import type { Recipe } from '../../item/types';
import { itemMatchesSearchTerm } from '../../item/util';
import RecipeList from '../RecipeList';
import Input from '../Input';
import PickableItem from '../PickableItem';
import { compareEnergyRatio } from '../../algorithm/util';

type Effort = 'low' | 'medium' | 'high';

function DerivationView() {
  const batchSolver = useApotheosisBatchSolver();

  const { items, setItems } = useAvailableItemsStore();
  const { targetItem, recipes, setTargetItem, setRecipes } = useDerivationStore();
  const itemsRef = useRef(items);
  const targetItemRef = useRef(targetItem);

  const [effort, setEffort] = useState<Effort>('medium');
  const maxGenerationsRef = useRef<number>(512);

  const [isDeriving, setIsDeriving] = useState(false);
  const [progressDisplay, setProgressDisplay] = useState('');

  const canDerive = batchSolver && items.length > 1 && targetItem && !isDeriving;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    targetItemRef.current = targetItem;
  }, [targetItem]);

  useEffect(() => {
    maxGenerationsRef.current = effort === 'low' ? 128 : effort === 'medium' ? 512 : 2048;
  }, [effort]);

  const progressCallbackThrottler = useProgressCallbackThrottler();

  useEffect(() => {
    if (!batchSolver || !isDeriving || itemsRef.current.length < 2 || !targetItemRef.current) return;

    const cancelDerivation = batchSolver.deriveRecipes(
      itemsRef.current,
      targetItemRef.current,
      maxGenerationsRef.current,
      progressCallbackThrottler((message) => {
        if (message.error) {
          console.error(message.error);
          setIsDeriving(false);
          return;
        }
        if (message.done) {
          setIsDeriving(false);
        }

        setRecipes(message.recipes ?? []);
        setProgressDisplay(`${message.count} recipes checked (${Math.round(message.progress * 100)})%`);
      }),
    );

    return () => {
      cancelDerivation();
    };
  }, [batchSolver, isDeriving, setRecipes, progressCallbackThrottler]);

  return (
    <>
      <h1 className="text-4xl font-pixel mb-4">Derivation</h1>
      <h2 className="text-2xl font-pixel mb-2">Available Items</h2>
      <InventoryPicker className="mb-2" items={items} onItemsChange={setItems} />

      <h2 className="text-2xl font-pixel mb-2">Target Item</h2>
      <PickableItem item={targetItem} onItemChange={setTargetItem} showUnfuseable={false} />

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
          onClick={() => setIsDeriving(true)}
          disabled={!canDerive}
        >
          {isDeriving ? 'Deriving...' : 'Derive!'}
        </Button>
        <Button
          className="mb-2 ml-2 bg-severe-600 hover:bg-severe-500"
          onClick={() => setIsDeriving(false)}
          disabled={!isDeriving}
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
        placeholder="search by input item"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
      />
      <RecipeList
        recipes={recipes}
        filter={(recipe) => recipe.inputs.some((input) => itemMatchesSearchTerm(searchTerm, input.item))}
        comparator={(a, b) => -compareEnergyRatio(a, b)}
      />
      <div className="h-12" />
    </>
  );
}


export default DerivationView;