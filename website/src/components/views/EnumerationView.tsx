import { useEffect, useRef, useState } from 'react';
import type { Recipe } from '../../item/types';
import InventoryPicker from '../InventoryPicker';
import { useApotheosisBatchSolver } from '../../item/hooks';
import { useEnumerationStore } from '../../stores';
import Button from '../Button';
import Slot from '../Slot';
import Input from '../Input';
import { itemMatchesSearchTerm } from '../../item/util';

type Intensity = 'low' | 'medium' | 'high';

function EnumerationView() {
  const batchSolver = useApotheosisBatchSolver();

  const { items, setItems } = useEnumerationStore();
  const itemsRef = useRef(items);

  const [effort, setEffort] = useState<Intensity>('medium');
  const targetCountRef = useRef<number>(65536);
  
  const [isEnumerating, setIsEnumerating] = useState(false);
  const [progressDisplay, setProgressDisplay] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);

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
  }, [batchSolver, isEnumerating]);

  return (
    <>
      <h1 className="text-4xl font-pixel mb-4">Enumeration</h1>
      <h2 className="text-2xl font-pixel mb-2">Available Items</h2>
      <InventoryPicker className="mb-2" items={items} onItemsChange={setItems} />

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
      
      {recipes.length > 0 && <RecipeList recipes={recipes} />}
    </>
  );
}

function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecipes = recipes
    .filter((recipe) => itemMatchesSearchTerm(searchTerm, recipe.output.item))
    .toSorted((a, b) => a.output.item.id - b.output.item.id);

  return (
    <>
      <h2 className="text-2xl font-pixel mb-2">Recipes</h2>
      <Input
        className="w-full mb-2"
        placeholder="search by output item"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
      />
      <div className="max-w-full h-128 overflow-y-auto">
        {filteredRecipes.length === 0 && (
          <div className="mt-4 text-center font-pixel text-fg-600">
            no recipes found
          </div>
        )}
        <div className="w-4xl mx-auto flex flex-wrap justify-center gap-2">
          {filteredRecipes.map((recipe, index) => (
            <RecipeDisplay key={index} recipe={recipe} />
          ))}
        </div>
      </div>
      <div className="h-12" />
    </>
  );
}

function RecipeDisplay({ recipe }: { recipe: Recipe }) {
  return (
    <div className="border-2 border-secondary-800 flex items-center">
      {recipe.inputs.map((qItem, index) => (
        <Slot key={index} item={qItem.item} count={qItem.count} />
      ))}
      <div className="font-pixel text-4xl">{'>'}</div>
      <Slot item={recipe.output.item} count={recipe.output.count} />
    </div>
  );
}

export default EnumerationView;