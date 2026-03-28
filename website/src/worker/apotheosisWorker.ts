import { loadWrappedSolver } from './apotheosisSolverRS';
import type { ApotheosisSolverRSWrapper } from './apotheosisSolverRS';
import type { BatchMessage, BatchResultMessage, ErrorMessage, ReadyMessage, ToWorkerMessage } from './types';

let wrappedSolver: ApotheosisSolverRSWrapper | null = null;

onmessage = (e: MessageEvent) => {
  const message = e.data as ToWorkerMessage;
  switch (message.type) {
    case 'initialize':
      loadWrappedSolver(message.fuserParams, message.itemData).then((newWrappedSolver) => {
        wrappedSolver = newWrappedSolver;
        const response: ReadyMessage = { type: 'ready', id: message.id };
        postMessage(response);
      }).catch((error) => {
        const response: ErrorMessage = {
          id: message.id,
          type: 'error',
          message: 'Error loading Rust solver'
        };
        if (error instanceof Error) {
          response.message += `: ${error.message}`;
        }
        postMessage(response);

        wrappedSolver = null; // Ensure wrappedSolver is null on failure
      });
      break;
    case 'batch':
      handleBatchMessage(message);
      break;
  }
};

const handleBatchMessage = (message: BatchMessage) => {
  if (!wrappedSolver) {
    const response: ErrorMessage = {
      id: message.id,
      type: 'error',
      message: 'Solver does not exist - either it is not initialized yet or crashed'
    };
    postMessage(response);
    return;
  }

  try {
    const output = wrappedSolver.fuseBatch(message.input);
    const batchResultMessage: BatchResultMessage = {
      id: message.id,
      type: 'batch_result',
      output,
    };
    postMessage(batchResultMessage, [output.ids.buffer, output.counts.buffer]);
  } catch (error) {
    wrappedSolver = null; // Ensure wrappedSolver is null on failure
    const errorMessage: ErrorMessage = {
      id: message.id,
      type: 'error',
      message: 'Error processing batch'
    };
    if (error instanceof Error) {
      errorMessage.message += `: ${error.message}`;
    }
    postMessage(errorMessage);
  }
};
