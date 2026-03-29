import type { FuserParameters, Item } from '../item/types';

interface BaseMessage {
  id: number;
}

export type ToWorkerMessage = InitializationMessage | BatchMessage;

export interface InitializationMessage extends BaseMessage {
  type: 'initialize';
  fuserParams: FuserParameters;
  itemData: Item[];
}

export interface BatchMessage extends BaseMessage {
  type: 'batch';
  input: SerializedInputBatch;
}

export type FromWorkerMessage = ReadyMessage | ErrorMessage | BatchResultMessage;

export interface ReadyMessage extends BaseMessage {
  type: 'ready';
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
}

export interface BatchResultMessage extends BaseMessage {
  type: 'batch_result';
  output: SerializedOutputBatch;
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

export interface SerializedOutputBatch {
  ids: Int32Array;
  counts: Int32Array;
}
