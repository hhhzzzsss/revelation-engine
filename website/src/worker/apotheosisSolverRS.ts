import init, { ApotheosisSolverRS } from '../../pkg/apotheosis_lib';
import type { FuserParameters, Item } from '../item/types';
import type { SerializedCostBatchOutput, SerializedInputBatch, SerializedFuseBatchOutput } from './types';

const initPromise = init();

export const loadSolver = async (fuserParams: FuserParameters, itemData: Item[]): Promise<ApotheosisSolverRS> => {
  const _sorted_tags = fuserParams.tags.toSorted();

  const property_weights = fuserParams.used_properties.map((prop) => fuserParams.used_properties_weights[prop]);
  const tag_magnitude = fuserParams.tag_magnitude;
  const color_weight = fuserParams.color_weight;
  const samey_punishment = fuserParams.samey_punishment;
  const ids = itemData.map((item) => item.id);
  const energies = itemData.map((item) => item.essence.energy);
  const biases = itemData.map((item) => item.essence.bias);
  const flattened_mood_vectors = itemData.map(
    (item) => fuserParams.used_properties.map(
      (prop) => item.essence.properties[prop]
    )
  ).flat();
  const flattened_color_vectors = itemData.map((item) => item.color).flat();
  const tag_bitsets = itemData.map((item) => tags_to_bitset(item.essence.tags, _sorted_tags));
  const output_tag_bitsets = itemData.map((item) => tags_to_bitset(item.essence.output_tags, _sorted_tags));
  const fuseable_ids = itemData.filter((item) => item.essence.fuseable).map((item) => item.id);

  await initPromise;
  return new ApotheosisSolverRS(
    Float64Array.from(property_weights),
    tag_magnitude,
    color_weight,
    samey_punishment,
    Int32Array.from(ids),
    Float64Array.from(energies),
    Float64Array.from(biases),
    Float64Array.from(flattened_mood_vectors),
    Float64Array.from(flattened_color_vectors),
    Uint32Array.from(tag_bitsets),
    Uint32Array.from(output_tag_bitsets),
    Int32Array.from(fuseable_ids)
  );
};
const tags_to_bitset = (tags: string[], sorted_tags: string[]): number => {
  let bitset = 0;
  for (const tag of tags) {
    const index = sorted_tags.indexOf(tag);
    if (index !== -1) {
      bitset |= 1 << index;
    }
  }
  return bitset;
};

export const loadWrappedSolver = async (fuserParams: FuserParameters, itemData: Item[]): Promise<ApotheosisSolverRSWrapper> => {
  const solver = await loadSolver(fuserParams, itemData);
  return new ApotheosisSolverRSWrapper(solver);
};
export class ApotheosisSolverRSWrapper {
  private solver: ApotheosisSolverRS;

  constructor(solver: ApotheosisSolverRS) {
    this.solver = solver;
  }

  public fuseBatch(serializedBatch: SerializedInputBatch): SerializedFuseBatchOutput {
    const result = this.solver.fuse_batch(
      serializedBatch.ids,
      serializedBatch.counts,
      serializedBatch.sample_sizes
    );
    const outputBatch: SerializedFuseBatchOutput = {
      ids: new Int32Array(result.ids),
      counts: new Int32Array(result.counts),
    };
    return outputBatch;
  }

  public costBatch(serializedBatch: SerializedInputBatch, target_id: number): SerializedCostBatchOutput {
    const result = this.solver.cost_batch(
      serializedBatch.ids,
      serializedBatch.counts,
      serializedBatch.sample_sizes,
      target_id
    );
    return {
      ids: new Int32Array(result.ids),
      counts: new Int32Array(result.counts),
      costs: new Float64Array(result.costs),
    };
  }
}
