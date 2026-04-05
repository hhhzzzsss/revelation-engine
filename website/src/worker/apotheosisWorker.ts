import { loadWrappedSolver } from './apotheosisSolverRS';
import type { ApotheosisSolverRSWrapper } from './apotheosisSolverRS';
import type { FromWorkerFullMessage, FromWorkerMessage, ToWorkerFullMessage, ToWorkerMessage } from './types';

type MessageWithTransfer = FromWorkerMessage & { transfer?: Transferable[] };

let wrappedSolver: ApotheosisSolverRSWrapper | null = null;

onmessage = async (e: MessageEvent) => {
  const { id: messageId, ...message } = e.data as ToWorkerFullMessage;

  const { transfer, ...response } = await handleMessage(message);
  const fullResponse: FromWorkerFullMessage = { ...response, id: messageId };

  if (transfer) {
    postMessage(fullResponse, transfer);
  } else {
    postMessage(fullResponse);
  }
};

const handleMessage = async (message: ToWorkerMessage): Promise<MessageWithTransfer> => {
  try {
    if (message.type === 'initialize') {
      if (wrappedSolver) {
        throw new Error('Solver is already initialized'); // Should not initialize twice
      }
      wrappedSolver = await loadWrappedSolver(message.fuserParams, message.itemData);
      return { type: 'ready' };
    }
    
    // Everything other than initialization requires the solver to be loaded
    if (!wrappedSolver) {
      throw new Error('Solver does not exist - either it is not initialized yet or crashed');
    }
    
    if (message.type === 'batch') {
      const output = wrappedSolver.fuseBatch(message.input);
      return {
        type: 'batch_result',
        output,
        transfer: [output.ids.buffer, output.counts.buffer]
      };
    }

    if (message.type === 'cost_batch') {
      const output = wrappedSolver.costBatch(message.input, message.target_id);
      return {
        type: 'cost_batch_result',
        output,
        transfer: [output.ids.buffer, output.counts.buffer, output.costs.buffer]
      };
    }
    
    throw new Error('Unknown message type');
  } catch (error) {
    wrappedSolver = null; // Ensure wrappedSolver is null after failure

    let errorMessage = `Error occurred while handling ${message.type} message`;
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    console.error(error);

    return { type: 'error', message: errorMessage };
  }
};
