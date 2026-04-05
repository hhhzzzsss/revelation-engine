import type { SerializedInputBatch } from '../worker/types';
import type { FuserParameters, Item, QuantifiedItem, Recipe } from '../item/types';
import { QualityHeuristicDerivationAggregator, QualityHeuristicEnumerationAggregator } from './recipeAggregator';
import PriorityQueue from './priorityQueue';
import WorkerPool from './workerPool';
import { clamp, randomInt, sample, sampleSize } from 'es-toolkit';
import { getEnergyRatio } from './util';

let batchSolverInstance: ApotheosisBatchSolver | null = null;
export const getApotheosisBatchSolver = (fuserParams: FuserParameters, itemData: Item[]) => {
  if (batchSolverInstance) {
    return batchSolverInstance;
  }
  batchSolverInstance = new ApotheosisBatchSolver(fuserParams, itemData);
  return batchSolverInstance;
};

export interface ProgressMessage {
  recipes?: Recipe[];
  progress: number; // value between 0 and 1
  count: number;
  error?: Error;
  done?: boolean;
}

interface Candidate {
  inputs: QuantifiedItem[];
  output: QuantifiedItem;
  cost: number;
}

class ApotheosisBatchSolver {
  private pool: WorkerPool;
  private itemMap: Record<number, Item>;

  constructor(fuserParams: FuserParameters, itemData: Item[]) {
    this.itemMap = Object.fromEntries(itemData.map((item) => [item.id, item]));
    this.pool = new WorkerPool(fuserParams, itemData);
  }

  public fuseBatch = async (input: QuantifiedItem[][], onSuccess: (recipes: Recipe[]) => void, onError: (error: Error) => void) => {
    const serializedBatch = this.serializeInputBatch(input);

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
  public costBatch = async (input: QuantifiedItem[][], target: Item, onSuccess: (costs: Candidate[]) => void, onError: (error: Error) => void): Promise<void> => {
    const serializedBatch = this.serializeInputBatch(input);

    await this.pool.submitMessage({
      type: 'cost_batch',
      input: serializedBatch,
      target_id: target.id,
    }, [
      serializedBatch.ids.buffer,
      serializedBatch.counts.buffer,
      serializedBatch.sample_sizes.buffer,
    ], (response) => {
      if (response.type !== 'cost_batch_result') {
        onError(new Error('Unexpected response type from worker'));
        return;
      }

      const outputIds = response.output.ids;
      const outputCounts = response.output.counts;
      const costs = response.output.costs;
      const candidates: Candidate[] = [];
      for (let i = 0; i < outputIds.length; i++) {
        const item = this.itemMap[outputIds[i]];
        if (item) {
          candidates.push({
            inputs: input[i],
            output: { item, count: outputCounts[i] },
            cost: costs[i],
          });
        } else {
          onError(new Error(`Worker returned unknown item ID: ${outputIds[i]}`));
          return;
        }
      }
      onSuccess(candidates);
    }, (error) => {
      onError(error);
    });
  };
  private serializeInputBatch = (input: QuantifiedItem[][]): SerializedInputBatch => {
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

    return {
      ids: Int32Array.from(ids),
      counts: Int32Array.from(counts),
      sample_sizes: Uint32Array.from(sampleSizes),
    };
  };

  public enumerateFusions = (
    availableItems: Item[],
    targetSampleCount: number,
    callback: (message: ProgressMessage) => void
  ): () => void => {
    let cancelled = false;
    const cancel = () => cancelled = true;

    const batchSize = 8192;
    const aggregator = new QualityHeuristicEnumerationAggregator();
    const transformer = new CopyOutputTransformer(availableItems);

    const sampleQueue: QuantifiedItem[][] = [];
    let recipesChecked = 0;

    const outputCallback = (recipes: Recipe[]) => {
      recipesChecked += recipes.length;
      for (const recipe of recipes) {
        aggregator.addRecipe(recipe);
        const transformed = transformer.transform(recipe);
        if (transformed) sampleQueue.push(transformed);
      }
    };

    const errorCallback = (error: Error) => {
      cancel();
      callback({ count: recipesChecked, progress: 1, error, done: true });
    };

    const processBatch = async () => {
      const batch = sampleQueue.splice(0, batchSize);
      await this.fuseBatch(batch, outputCallback, errorCallback);
    };

    void (async () => {
      for (const [input, progress] of getTwoInputIterator(availableItems, targetSampleCount)) {
        if (cancelled) {
          return;
        }

        sampleQueue.push(input);
        while (sampleQueue.length >= batchSize) {
          await processBatch();
          callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress });
        }
      }

      while (await this.pool.hasNextUpdate()) {
        if (sampleQueue.length > 0) {
          await processBatch();
          callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress: 1 });
        }
      }

      callback({ recipes: aggregator.getRecipes(), count: recipesChecked, progress: 1, done: true });
    })().catch((e) => {
      const error = e instanceof Error ? e : new Error(String(e));
      callback({ count: recipesChecked, progress: 1, error, done: true });
    });

    return cancel;
  };

  public deriveRecipes = (
    availableItems: Item[],
    target: Item,
    maxGenerations: number,
    callback: (message: ProgressMessage) => void
  ): () => void => {
    let cancelled = false;
    const cancel = () => cancelled = true;

    const populationBatchNum = this.pool.getNumWorkers();
    const batchSize = 1024 / populationBatchNum;
    const populationSize = batchSize * populationBatchNum;
    const numSubPopulations = 8;
    const eliteProportion = 1 / 16;
    const mutationProportion = 8 / 16;
    // const crossoverProportion = 7 / 16;

    const aggregator = new QualityHeuristicDerivationAggregator();
    const offspringCalculator = new OffspringCalculator(availableItems);
    
    const getRandomSample = (): QuantifiedItem[] => {
      const numInputs = randomInt(2, Math.min(availableItems.length, 6) + 1);
      const items = sampleSize(availableItems, numInputs);
      return items.map(item => ({ item, count: randomInt(1, item.stack_size + 1) }));
    };

    const aggregateValidRecipes = (candidates: Candidate[]) => {
      for (const candidate of candidates) {
        if (candidate.output.item.id === target.id) {
          aggregator.addRecipe({
            inputs: candidate.inputs,
            output: candidate.output,
          });
        }
      }
    };

    const subtractEnergyRatioFromValidRecipes = (candidates: Candidate[]) => {
      candidates.forEach(candidate => {
        if (candidate.output.item.id === target.id) {
          candidate.cost -= getEnergyRatio({ inputs: candidate.inputs, output: candidate.output });
        }
      });
    };

    (async () => {
      // Initialize population with random samples and compute initial candidates
      let population: QuantifiedItem[][] = Array.from({ length: populationSize }, () => getRandomSample());
      let candidates = await this.computePopulationCosts(population, target, batchSize);
      subtractEnergyRatioFromValidRecipes(candidates);
      aggregateValidRecipes(candidates); // Aggregate any valid recipes

      const subPopBestCosts = Array.from({ length: numSubPopulations }, () => Infinity);
      const subPopLastImprovementGen = Array.from({ length: numSubPopulations }, () => 0);

      for (let generation = 1; generation <= maxGenerations; generation++) {
        if (cancelled) {
          return;
        }

        // Clear population array and repopulate with offspring
        population = [];
        for (let subPopIdx = 0; subPopIdx < numSubPopulations; subPopIdx++) {
          const subPopStart = Math.floor(subPopIdx * populationSize / numSubPopulations);
          const subPopEnd = Math.floor((subPopIdx + 1) * populationSize / numSubPopulations);
          const subPopCandidates = candidates.slice(subPopStart, subPopEnd);
          subPopCandidates.sort((a, b) => a.cost - b.cost); // Sort candidates by increasing cost

          if (subPopCandidates[0].cost < subPopBestCosts[subPopIdx]) {
            subPopBestCosts[subPopIdx] = subPopCandidates[0].cost;
            subPopLastImprovementGen[subPopIdx] = generation;
          }

          if (generation - subPopLastImprovementGen[subPopIdx] >= 128) {
            console.log(`Reinitializing subpopulation ${subPopIdx} at generation ${generation} due to lack of improvement`);
            // If no improvement in 64 generations, reinitialize subpopulation with random samples
            for (let i = subPopStart; i < subPopEnd; i++) {
              population.push(getRandomSample());
            }
            subPopBestCosts[subPopIdx] = Infinity;
            subPopLastImprovementGen[subPopIdx] = generation;
          } else {
            // Otherwise, create offspring from current subpopulation
            const elitePopulation = Math.floor(eliteProportion * subPopCandidates.length);
            const mutationPopulation = Math.floor(mutationProportion * subPopCandidates.length);
            const crossoverPopulation = subPopCandidates.length - elitePopulation - mutationPopulation;
            for (let i = 0; i < elitePopulation; i++) {
              population.push(subPopCandidates[i].inputs);
            }
            for (let i = 0; i < mutationPopulation; i++) {
              const parent = this.tournamentSelect(subPopCandidates);
              const offspring = offspringCalculator.getMutation(parent.inputs);
              population.push(offspring);
            }
            for (let i = 0; i < crossoverPopulation; i++) {
              const parentA = this.tournamentSelect(subPopCandidates);
              const parentB = this.tournamentSelect(subPopCandidates);
              const offspring = offspringCalculator.getCrossover(parentA.inputs, parentB.inputs);
              population.push(offspring);
            }
          }
        }

        // Clear candidates array and replace compute new candidates from the new population
        candidates = await this.computePopulationCosts(population, target, batchSize);
        subtractEnergyRatioFromValidRecipes(candidates);
        aggregateValidRecipes(candidates); // Aggregate any valid recipes

        callback({ recipes: aggregator.getRecipes(), count: (generation + 1) * populationSize, progress: (generation + 1) / maxGenerations });
      }

      callback({ recipes: aggregator.getRecipes(), count: maxGenerations * populationSize, progress: 1, done: true });
    })().catch((e) => {
      const error = e instanceof Error ? e : new Error(String(e));
      callback({ count: 0, progress: 1, error, done: true });
    });

    return cancel;
  };
  private tournamentSelect = (candidates: Candidate[]): Candidate => {
    const [candidateA, candidateB] = sampleSize(candidates, 2);
    return candidateA.cost < candidateB.cost ? candidateA : candidateB;
  };
  private computePopulationCosts = async (population: QuantifiedItem[][], target: Item, batchSize: number): Promise<Candidate[]> => {
    const errors: Error[] = [];
    const results: Candidate[] = Array.from({ length: population.length }, () => ({ inputs: population[0], output: { item: target, count: 1 }, cost: Infinity }));
    const outputCallback = (popIdx: number, candidates: Candidate[]) => {
      for (let j = 0; j < candidates.length; j++) {
        results[popIdx + j] = candidates[j];
      }
    };
    const errorCallback = (error: Error) => {
      errors.push(error);
    };
    for (let popIdx = 0; popIdx < population.length; popIdx += batchSize) {
      const batch = population.slice(popIdx, popIdx + batchSize);
      void this.costBatch(batch, target, (candidates) => outputCallback(popIdx, candidates), errorCallback);
      if (errors.length > 0) throw errors[0];
    }
    while (await this.pool.hasNextUpdate()) {
      if (errors.length > 0) throw errors[0];
    }
    return results;
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

class OffspringCalculator {
  private availableItems: Item[];
  private availableItemMap: Map<number, number>; // item ID to index in availableItemIds

  constructor(availableItems: Item[]) {
    this.availableItems = availableItems;
    this.availableItemMap = new Map(this.availableItems.map((item, index) => [item.id, index]));
  }

  public getMutation = (input: QuantifiedItem[]): QuantifiedItem[] => {
    const newInput = [...input];

    const mutationType = randomInt(6);
    if (mutationType === 0) {
      if (newInput.length <= 2) {
        this.mutateRandomItem(newInput);
      } else {
        this.removeRandomItem(newInput);
      }
    } else if (mutationType === 1) {
      if (newInput.length >= 6) {
        this.mutateRandomItem(newInput);
      } else {
        this.addRandomItem(newInput);
      }
    } else if (mutationType === 2) {
      this.mutateRandomItem(newInput);
    } else {
      this.modifyCount(newInput);
    }

    return newInput;
  };

  private removeRandomItem = (newInput: QuantifiedItem[]) => {
    const idxToRemove = randomInt(0, newInput.length);
    newInput.splice(idxToRemove, 1);
  };

  private addRandomItem = (newInput: QuantifiedItem[]) => {
    const usedIdxs = newInput.map(qItem => this.availableItemMap.get(qItem.item.id) ?? -1).filter(idx => idx !== -1);
    if (usedIdxs.length >= this.availableItems.length) return; // Can't add if all items are already used
    usedIdxs.sort((a, b) => a - b);

    let idxToAdd = randomInt(0, this.availableItems.length - usedIdxs.length);
    for (const usedIdx of usedIdxs) {
      if (idxToAdd >= usedIdx) {
        idxToAdd++;
      } else {
        break;
      }
    }

    const itemToAdd = this.availableItems[idxToAdd];
    newInput.push({ item: itemToAdd, count: randomInt(1, itemToAdd.stack_size + 1) });
  };

  private mutateRandomItem = (newInput: QuantifiedItem[]) => {
    this.removeRandomItem(newInput);
    this.addRandomItem(newInput);
  };

  private modifyCount = (newInput: QuantifiedItem[]) => {
    const idxToModify = randomInt(0, newInput.length);
    const qItem = newInput[idxToModify];
    const newCount = clamp(qItem.count + sample([-1, 1]), 1, qItem.item.stack_size);
    newInput[idxToModify] = { ...qItem, count: newCount };
  };

  public getCrossover = (inputA: QuantifiedItem[], inputB: QuantifiedItem[]): QuantifiedItem[] => {
    const mapA = new Map<number, QuantifiedItem>();
    for (const qItem of inputA) {
      const existing = mapA.get(qItem.item.id);
      if (existing) {
        existing.count += qItem.count;
      } else {
        mapA.set(qItem.item.id, { ...qItem });
      }
    }

    const mapB = new Map<number, QuantifiedItem>();
    for (const qItem of inputB) {
      const existing = mapB.get(qItem.item.id);
      if (existing) {
        existing.count += qItem.count;
      } else {
        mapB.set(qItem.item.id, { ...qItem });
      }
    }

    const offspring: QuantifiedItem[] = [];
    const uniqueCandidates: QuantifiedItem[] = [];

    for (const [id, qItemA] of mapA) {
      const qItemB = mapB.get(id);
      if (qItemB) {
        const minCount = Math.min(qItemA.count, qItemB.count);
        const maxCount = Math.max(qItemA.count, qItemB.count);
        offspring.push({
          item: qItemA.item,
          count: randomInt(minCount, maxCount + 1),
        });
      } else {
        uniqueCandidates.push({ ...qItemA });
      }
    }

    for (const [id, qItemB] of mapB) {
      if (!mapA.has(id)) {
        uniqueCandidates.push({ ...qItemB });
      }
    }

    const minParentSize = Math.min(mapA.size, mapB.size);
    const maxParentSize = Math.max(mapA.size, mapB.size);
    const targetSize = randomInt(minParentSize, maxParentSize + 1);
    const targetUniqueCount = targetSize - offspring.length;
    if (targetUniqueCount > 0) {
      offspring.push(...sampleSize(uniqueCandidates, targetUniqueCount));
    }

    return offspring;
  };
}
