import ApotheosisWorker from '../worker/apotheosisWorker.ts?worker'; 
import type { FuserParameters, Item } from '../item/types';
import type { ToWorkerMessage, FromWorkerMessage, ToWorkerFullMessage, FromWorkerFullMessage } from '../worker/types';
import { v7 as uuidv7 } from 'uuid';

/** Sends a message to a worker and awaits a response. Rejects if the worker responds with an error or doesn't respond in time */
const sendMessageToWorker = (worker: Worker, message: ToWorkerMessage, transfer?: Transferable[]): Promise<FromWorkerMessage> => {
  const fullMessage: ToWorkerFullMessage = { ...message, id: uuidv7() };

  return new Promise<FromWorkerMessage>((resolve, reject) => {
    let responded = false;

    const messageHandler = (e: MessageEvent) => {
      const {id: responseId, ...response} = e.data as FromWorkerFullMessage;
      if (fullMessage.id === responseId) {
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
      worker.postMessage(fullMessage, transfer);
    } else {
      worker.postMessage(fullMessage);
    }

    setTimeout(() => {
      if (!responded) {
        reject(new Error('Worker did not respond in time'));
        worker.removeEventListener('message', messageHandler);
      }
    }, 30000); // 30 second timeout, generally should not happen unless something went very wrong in the worker
  });
};

class WorkerHandler {
  private fuserParams: FuserParameters;
  private itemData: Item[];
  private workerPromise: Promise<Worker>;
  private instanceId: string;
  private busy: boolean;

  constructor(fuserParams: FuserParameters, itemData: Item[]) {
    this.fuserParams = fuserParams;
    this.itemData = itemData;

    this.instanceId = uuidv7();
    this.busy = false;

    this.workerPromise = this.initalizeWorker();
  }
  
  private initalizeWorker = async (): Promise<Worker> => {
    const worker = new ApotheosisWorker();

    try {
      const response = await sendMessageToWorker(worker, {
        type: 'initialize',
        fuserParams: this.fuserParams,
        itemData: this.itemData,
      });

      if (response.type !== 'ready') {
        throw new Error('Worker failed to initialize');
      }
    } catch (error) {
      worker.terminate();
      throw error;
    }

    return worker;
  };

  /** Creates a new worker instance and initializes it. If a worker already exists, it will be terminated before initializing a new one. */
  public restartWorker = () => {
    void this.workerPromise.then((worker) => worker.terminate()); // Terminate existing worker if it exists

    this.instanceId = uuidv7();
    this.busy = false;

    this.workerPromise = this.initalizeWorker();
  };

  /** Sends a message to the worker and awaits a response. */
  public sendMessage = async (message: ToWorkerMessage, transfer?: Transferable[]): Promise<FromWorkerMessage> => {
    if (this.busy) {
      throw new Error('Worker is currently busy');
    }
    
    this.busy = true; // Immediately lock (function is sync before first await)
    const initialInstanceId = this.instanceId;

    try {
      const worker = await this.workerPromise;
      if (initialInstanceId !== this.instanceId) {
        throw new Error('Worker instance changed during message handling');
      }

      const response = await sendMessageToWorker(worker, message, transfer);
      if (initialInstanceId !== this.instanceId) {
        throw new Error('Worker instance changed during message handling');
      }

      this.busy = false;

      return response;
    } catch (error) {
      if (initialInstanceId !== this.instanceId) {
        throw new Error('Worker instance changed during message handling');
      }
      
      // If there's an error, we assume the worker is in a bad state and restart it
      this.restartWorker();
      throw error;
    }
  };

  public isBusy = (): boolean => {
    return this.busy;
  };
}

class WorkerPool {
  private workerHandlers: WorkerHandler[] = [];
  private freeWorkerCallbacks: ((freeWorker: WorkerHandler) => void)[] = [];
  private updateCallbacks: (() => void)[] = [];

  constructor(fuserParams: FuserParameters, itemData: Item[]) {
    for (let i = 0; i < Math.min(navigator.hardwareConcurrency, 8); i++) { // Max of 8 workers for now
      this.workerHandlers.push(new WorkerHandler(fuserParams, itemData));
    }
  }

  submitMessage = async (message: ToWorkerMessage, transfer?: Transferable[], onSuccess?: (response: FromWorkerMessage) => void, onError?: (error: Error) => void) => {
    let workerHandler = this.getFreeWorker();
    while (!workerHandler) {
      await this.waitForFreeWorker();
      workerHandler = this.getFreeWorker();
    }

    workerHandler.sendMessage(message, transfer)
      .then((response) => {
        onSuccess?.(response);
      })
      .catch((error) => {
        if (error instanceof Error) {
          onError?.(error);
        } else {
          onError?.(new Error(String(error)));
        }
      })
      .finally(() => {
        if (this.freeWorkerCallbacks.length > 0) {
          this.freeWorkerCallbacks.shift()?.(workerHandler);
        }
        this.updateCallbacks.forEach(callback => callback());
        this.updateCallbacks = [];
      });
  };

  private getFreeWorker = (): WorkerHandler | null => {
    for (const workerHandler of this.workerHandlers) {
      if (!workerHandler.isBusy()) {
        return workerHandler;
      }
    }
    return null;
  };

  private waitForFreeWorker = (): Promise<void> => {
    return new Promise((resolve) => this.freeWorkerCallbacks.push(() => resolve()));
  };

  hasNextUpdate = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!this.hasBusyWorker()) {
        resolve(false);
        return;
      }
      this.updateCallbacks.push(() => resolve(true));
    });
  };

  private hasBusyWorker = (): boolean => {
    return this.workerHandlers.some(workerHandler => workerHandler.isBusy());
  };

  getNumWorkers = (): number => {
    return this.workerHandlers.length;
  };
}

export default WorkerPool;
