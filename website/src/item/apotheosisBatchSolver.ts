import ApotheosisWorker from '../worker/apotheosisWorker.ts?worker'; 
import type { FromWorkerMessage, InitializationMessage, ToWorkerMessage } from '../worker/types';
import type { FuserParameters, Item, QuantifiedItem, Recipe, SerializedInputBatch } from './types';
import { EnergyRatioRecipeAggregator } from './recipeAggregator';

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
  private workerPromise: Promise<Worker>;
  private fuserParams: FuserParameters;
  private itemData: Item[];
  private itemMap: Record<number, Item>;
  private messageIdCounter = 0;

  constructor(fuserParams: FuserParameters, itemData: Item[]) {
    this.fuserParams = fuserParams;
    this.itemData = itemData;
    this.itemMap = Object.fromEntries(itemData.map((item) => [item.id, item]));
    this.workerPromise = this.initializeWorker();
  }

  private initializeWorker = async () => {
    const worker = new ApotheosisWorker();

    try {
      const response = await this.sendWorkerMessage(worker, {
        type: 'initialize',
        fuserParams: this.fuserParams,
        itemData: this.itemData,
      } as InitializationMessage);

      if (response.type !== 'ready') {
        throw new Error('Worker failed to initialize');
      }
    } catch (error) {
      worker.terminate();
      throw error;
    }

    return worker;
  };

  public fuseBatch = async (input: QuantifiedItem[][]): Promise<QuantifiedItem[]> => {
    const worker = await this.workerPromise;

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

    // Send message to worker and await response1
    let response: FromWorkerMessage;
    try {
      response = await this.sendWorkerMessage(
        worker,
        {
          id: this.messageIdCounter++,
          type: 'batch',
          input: serializedBatch,
        },
        [
          serializedBatch.ids.buffer,
          serializedBatch.counts.buffer,
          serializedBatch.sample_sizes.buffer
        ],
      );
      
      if (response.type !== 'batch_result') {
        throw new Error('Unexpected response type from worker');
      }
    } catch (error) {
      // If there's an error, we assume the worker has crashed and we need to reinitialize it
      worker.terminate();
      this.workerPromise = this.initializeWorker();
      throw error;
    }

    const outputIds = response.output.ids;
    const outputCounts = response.output.counts;
    const result: QuantifiedItem[] = [];
    for (let i = 0; i < outputIds.length; i++) {
      const item = this.itemMap[outputIds[i]];
      if (item) {
        result.push({ item, count: outputCounts[i] });
      } else {
        throw new Error(`Worker returned unknown item ID: ${outputIds[i]}`);
      }
    }
    return result;
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

    let batch: QuantifiedItem[][] = [];
    let recipesChecked = 0;

    const flushBatch = async () => {
      const results = await this.fuseBatch(batch);
      const recipes = results.map((output, index) => ({
        inputs: batch[index],
        output,
      }));

      batch = [];

      recipesChecked += recipes.length;
      for (const recipe of recipes) {
        aggregator.addRecipe(recipe);
        const transformed = transformer.transform(recipe);
        if (transformed) batch.push(transformed);
      }
    };

    void (async () => {
      for (const [input, progress] of getTwoInputIterator(availableItems, targetSampleCount)) {
        if (cancelled) {
          return;
        }

        batch.push(input);
        while (batch.length >= batchSize) {
          await flushBatch();
          callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress });
        }
      }

      while (batch.length > 0) {
        await flushBatch();
        callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress: 1 });
      }

      callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress: 1, done: true });
    })().catch(() => {
      callback({ count: recipesChecked, progress: 1, error: new Error('Failed to enumerate fusions'), done: true });
    });

    return cancel;
  };

  private sendWorkerMessage = (worker: Worker, message: ToWorkerMessage, transfer?: Transferable[]): Promise<FromWorkerMessage> => {
    return new Promise<FromWorkerMessage>((resolve, reject) => {
      let responded = false;

      const messageHandler = (e: MessageEvent) => {
        const response = e.data as FromWorkerMessage;
        if (response.id === message.id) {
          if (response.type === 'error') {
            reject(new Error(response.message));
          } else {
            resolve(response);
          }
          worker.removeEventListener('message', messageHandler);
          responded = true;
        }
      };

      worker.addEventListener('message', messageHandler);
      if (transfer) {
        worker.postMessage(message, transfer);
      } else {
        worker.postMessage(message);
      }

      setTimeout(() => {
        if (!responded) {
          reject(new Error('Worker did not respond in time'));
          worker.removeEventListener('message', messageHandler);
        }
      }, 30000); // 30 second timeout
    });
  };
}


type RecipeInputGenerator = Generator<[QuantifiedItem[], number]>; // yields [input, progress]
type VariationGenerator = Generator<[number, number]>;

function* getTwoInputIterator(items: Item[], targetSampleCount: number): RecipeInputGenerator {
  const combinations = (items.length * (items.length - 1)) / 2;
  const variationBudget = Math.floor(targetSampleCount / combinations) + 1;
  let counter = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (const [countI, countJ] of getVariationIterator(items[i], items[j], variationBudget)) {
        yield [[{ item: items[i], count: countI }, { item: items[j], count: countJ }], counter / combinations];
      }
      counter++;
    }
  }
}
function* getVariationIterator(item1: Item, item2: Item, limit: number): VariationGenerator {
  const swapped = item1.essence.energy > item2.essence.energy;
  if (swapped) {
    [item1, item2] = [item2, item1];
  }

  const energy1 = item1.essence.energy;
  const energy2 = item2.essence.energy;
  const stackSize1 = item1.stack_size;
  const stackSize2 = item2.stack_size;
  let count1 = 1;
  let count2 = 1;

  for (let i = 0; i < limit; i++) {
    yield swapped ? [count2, count1] : [count1, count2];

    count1++;
    if (energy1*count1 > 2*energy2*count2 || count1 > stackSize1) {
      count1 = 1;
      count2++;
      if (count2 > stackSize2) {
        return;
      }
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