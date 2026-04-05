import type { FuserParameters, Item } from '../item/types';

interface MessageMeta {
  id: string;
}

export type ToWorkerFullMessage = MessageMeta & ToWorkerMessage;

export type ToWorkerMessage = InitializationMessage | BatchMessage | CostBatchMessage;

export interface InitializationMessage {
  type: 'initialize';
  fuserParams: FuserParameters;
  itemData: Item[];
}

export interface BatchMessage {
  type: 'batch';
  input: SerializedInputBatch;
}

export interface CostBatchMessage {
  type: 'cost_batch';
  input: SerializedInputBatch;
  target_id: number;
}

export type FromWorkerFullMessage = MessageMeta & FromWorkerMessage;

export type FromWorkerMessage = ReadyMessage | ErrorMessage | BatchResultMessage | CostBatchResultMessage;

export interface ReadyMessage {
  type: 'ready';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface BatchResultMessage {
  type: 'batch_result';
  output: SerializedFuseBatchOutput;
}

export interface CostBatchResultMessage {
  type: 'cost_batch_result';
  output: SerializedCostBatchOutput;
}

export interface SerializedSlot {
  id: number;
  count: number;
}

export interface SerializedInputBatch {
  ids: Int32Array;
  counts: Int32Array;
  sample_sizes: Uint32Array;
}

export interface SerializedFuseBatchOutput {
  ids: Int32Array;
  counts: Int32Array;
}

export interface SerializedCostBatchOutput {
  ids: Int32Array;
  counts: Int32Array;
  costs: Float64Array;
}
