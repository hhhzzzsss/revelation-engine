import type { FuserParameters, Item, SerializedInputBatch, SerializedOutputBatch } from '../item/types';

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

interface BaseMessage {
  id: number;
}
