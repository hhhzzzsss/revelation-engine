import type { SerializedInputBatch } from '../worker/types';
import type { FuserParameters, Item, QuantifiedItem, Recipe } from '../item/types';
import { EnergyRatioRecipeAggregator } from './recipeAggregator';
import PriorityQueue from './priorityQueue';
import WorkerPool from './workerPool';

let batchSolverInstance: ApotheosisBatchSolver | null = null;
export const getApotheosisBatchSolver = (fuserParams: FuserParameters, itemData: Item[]) => {
  if (batchSolverInstance) {
    return batchSolverInstance;
  }
  batchSolverInstance = new ApotheosisBatchSolver(fuserParams, itemData);
  return batchSolverInstance;
};

interface ProgressMessage {
  recipes?: Recipe[];
  progress: number; // value between 0 and 1
  count: number;
  error?: Error;
  done?: boolean;
}

class ApotheosisBatchSolver {
  private pool: WorkerPool;
  private itemMap: Record<number, Item>;

  constructor(fuserParams: FuserParameters, itemData: Item[]) {
    this.itemMap = Object.fromEntries(itemData.map((item) => [item.id, item]));
    this.pool = new WorkerPool(fuserParams, itemData);
  }

  public fuseBatch = async (input: QuantifiedItem[][], onSuccess: (recipes: Recipe[]) => void, onError: (error: Error) => void) => {
    const ids = [];
    const counts = [];
    const sampleSizes = [];
    for (const sample of input) {
      const deduplicatedSampleMap = new Map<number, number>();
      for (const qItem of sample) {
        deduplicatedSampleMap.set(qItem.item.id, (deduplicatedSampleMap.get(qItem.item.id) ?? 0) + qItem.count);
      }
      sampleSizes.push(deduplicatedSampleMap.size);
      for (const [id, count] of deduplicatedSampleMap) {
        ids.push(id);
        counts.push(count);
      }
    }

    const serializedBatch: SerializedInputBatch = {
      ids: Int32Array.from(ids),
      counts: Int32Array.from(counts),
      sample_sizes: Uint32Array.from(sampleSizes),
    };

    await this.pool.submitMessage({
      type: 'batch',
      input: serializedBatch,
    }, [
      serializedBatch.ids.buffer,
      serializedBatch.counts.buffer,
      serializedBatch.sample_sizes.buffer,
    ], (response) => {
      if (response.type !== 'batch_result') {
        onError(new Error('Unexpected response type from worker'));
        return;
      }

      const outputIds = response.output.ids;
      const outputCounts = response.output.counts;
      const recipes: Recipe[] = [];
      for (let i = 0; i < outputIds.length; i++) {
        const item = this.itemMap[outputIds[i]];
        if (item) {
          recipes.push({
            inputs: input[i],
            output: { item, count: outputCounts[i] },
          });
        } else {
          onError(new Error(`Worker returned unknown item ID: ${outputIds[i]}`));
          return;
        }
      }
      onSuccess(recipes);
    }, (error) => {
      onError(error);
    });
  };

  public enumerateFusions = (
    availableItems: Item[],
    targetSampleCount: number,
    callback: (message: ProgressMessage) => void
  ): () => void => {
    let cancelled = false;
    const cancel = () => cancelled = true;

    const batchSize = 8192;
    const aggregator = new EnergyRatioRecipeAggregator();
    const transformer = new CopyOutputTransformer(availableItems);

    const batch: QuantifiedItem[][] = [];
    let recipesChecked = 0;

    const outputCallback = (recipes: Recipe[]) => {
      recipesChecked += recipes.length;
      for (const recipe of recipes) {
        aggregator.addRecipe(recipe);
        const transformed = transformer.transform(recipe);
        if (transformed) batch.push(transformed);
      }
    };

    const errorCallback = (error: Error) => {
      cancel();
      callback({ count: recipesChecked, progress: 1, error, done: true });
    };

    const processBatch = async () => {
      const subBatch = batch.splice(0, batchSize);
      await this.fuseBatch(subBatch, outputCallback, errorCallback);
    };

    void (async () => {
      for (const [input, progress] of getTwoInputIterator(availableItems, targetSampleCount)) {
        if (cancelled) {
          return;
        }

        batch.push(input);
        while (batch.length >= batchSize) {
          await processBatch();
          callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress });
        }
      }

      while (await this.pool.hasNextUpdate()) {
        if (batch.length > 0) {
          await processBatch();
          callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress: 1 });
        }
      }

      callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress: 1, done: true });
    })().catch(() => {
      callback({ count: recipesChecked, progress: 1, error: new Error('Failed to enumerate fusions'), done: true });
    });

    return cancel;
  };
}


type RecipeInputGenerator = Generator<[QuantifiedItem[], number]>; // yields [input, progress]
type VariationGenerator = Generator<QuantifiedItem[]>;

function* getTwoInputIterator(items: Item[], targetSampleCount: number): RecipeInputGenerator {
  const combinations = (items.length * (items.length - 1)) / 2;
  const variationBudget = Math.floor(targetSampleCount / combinations) + 1;
  let counter = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (const inputVariation of getVariationIterator([items[i], items[j]], variationBudget)) {
        yield [inputVariation, counter / combinations];
      }
      counter++;
    }
  }
}

// Try input variations in order of increasing energy
function* getVariationIterator(items: Item[], limit: number): VariationGenerator {
  const pq = new PriorityQueue<number[]>();
  const energies = items.map(item => item.essence.energy);
  const stackSizes = items.map(item => item.stack_size);
  const getKey = (counts: number[]) => counts.reduce((sum, count) => sum*50 + count, 0);
  const getEnergy = (counts: number[]) => counts.reduce((sum, count, i) => sum + energies[i] * count, 0);
  const getVariation = (counts: number[]): QuantifiedItem[] => counts.map((count, i) => ({ item: items[i], count }));

  const seen = new Set<number>();
  const initialCount = Array<number>(items.length).fill(1);
  pq.push(initialCount, getEnergy(initialCount));
  for (let i = 0; i < limit; i++) {
    const counts = pq.pop();
    if (!counts) break;
    yield getVariation(counts);

    for (let j = 0; j < items.length; j++) {
      if (counts[j] >= stackSizes[j]) continue;
      const newCounts = [...counts];
      newCounts[j]++;
      const key = getKey(newCounts);
      if (seen.has(key)) continue;
      seen.add(key);
      pq.push(newCounts, getEnergy(newCounts));
    }
  }
}

class CopyOutputTransformer {
  public availableItemIds: Set<number>;
  constructor (items: Item[]) {
    this.availableItemIds = new Set(items.map(item => item.id));
  }

  public transform(recipe: Recipe): QuantifiedItem[] | null {
    if (
      recipe.inputs.length >= 6 || // Max recipe length
      !this.availableItemIds.has(recipe.output.item.id) || // Output not available
      recipe.inputs.some(input => input.item.id == recipe.output.item.id) // Output already in input
    ) {
      return null;
    }
    return [...recipe.inputs, { item: recipe.output.item, count: 1 }];
  }
}