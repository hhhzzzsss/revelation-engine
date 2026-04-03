import type { FuserParameters, Item } from '../item/types';

interface MessageMeta {
  id: string;
}

export type ToWorkerFullMessage = MessageMeta & ToWorkerMessage;

export type ToWorkerMessage = InitializationMessage | BatchMessage;

export interface InitializationMessage {
  type: 'initialize';
  fuserParams: FuserParameters;
  itemData: Item[];
}

export interface BatchMessage {
  type: 'batch';
  input: SerializedInputBatch;
}

export type FromWorkerFullMessage = MessageMeta & FromWorkerMessage;

export type FromWorkerMessage = ReadyMessage | ErrorMessage | BatchResultMessage;

export interface ReadyMessage {
  type: 'ready';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface BatchResultMessage {
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
