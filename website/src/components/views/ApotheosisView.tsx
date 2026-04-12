import { useMemo } from 'react';
import type { Recipe, QuantifiedItem } from '../../item/types';
import { useFavoriteRecipes } from '../../item/hooks';
import { useApotheosisSolver } from '../../algorithm/hooks';
import { useApotheosisStore } from '../../stores';
import PickableSlot from '../PickableSlot';
import LabeledSlot from '../LabeledSlot';
import FavoriteHeartButton from '../FavoriteHeartButton';
import StackSizeSlider from '../StackSizeSlider';

function ApotheosisView() {
  const { qItems, setQItem } = useApotheosisStore();
  const solver = useApotheosisSolver();

  const { isFavoriteRecipe, toggleFavoriteRecipe } = useFavoriteRecipes();

  const result: QuantifiedItem | null = useMemo(() => {
    if (!solver) return null;
    return solver.fuse(qItems.filter((qItem) => qItem !== null));
  }, [solver, qItems]);

  const recipe = useMemo<Recipe | null>(() => {
    if (!result) return null;
    console.log('result', result);
    const inputs = qItems.filter((qItem) => qItem !== null);
    return { inputs, output: result };
  }, [qItems, result]);

  if (!solver) {
    return <div className="font-pixel text-2xl">Loading...</div>;
  }

  return (
    <>
      <h1 className="text-4xl font-pixel mb-4">Apotheosis</h1>
      <StackSizeSlider className="mb-2" />
      <div className="flex justify-center">
        <div className="flex flex-col px-4 border-r-2 border-secondary-800">
          <h2 className="text-2xl font-pixel">Input</h2>
          {qItems.map((qItem, index) => (
            <PickableSlot
              key={index}
              qItem={qItem}
              onQItemChange={(newQItem) => setQItem(index, newQItem)}
            />
          ))}
        </div>
        <div className="flex flex-col px-4">
          <h2 className="text-2xl font-pixel">Output</h2>
          <LabeledSlot item={result?.item} count={result?.count} />
          <div className="flex-1" />
        </div>
      </div>
      {recipe && (
        <div className="mt-6 flex justify-center items-center space-x-2">
          <span className="font-pixel">favorite recipe: </span>
          <FavoriteHeartButton
            filled={isFavoriteRecipe(recipe)}
            onClick={() => toggleFavoriteRecipe(recipe)}
          />
        </div>
      )}
    </>
  );
}

export default ApotheosisView;
