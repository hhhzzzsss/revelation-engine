import { useCallback, useMemo, useRef } from 'react';
import { useFuserParameters, useItemData } from '../item/hooks';
import { getApotheosisBatchSolver } from './apotheosisBatchSolver';
import type { ProgressMessage } from './apotheosisBatchSolver';
import ApotheosisSolver from './apotheosisSolver';

export const useApotheosisSolver = () => {
  const { data: fuserParams } = useFuserParameters();
  const { data: itemData } = useItemData();
  return useMemo(() => {
    if (!fuserParams || !itemData) return null;
    return new ApotheosisSolver(fuserParams, itemData);
  }, [fuserParams, itemData]);
};

export const useApotheosisBatchSolver = () => {
  const { data: fuserParams } = useFuserParameters();
  const { data: itemData } = useItemData();
  if (!fuserParams || !itemData) return null;
  return getApotheosisBatchSolver(fuserParams, itemData);
};

type ProgressCallback = (message: ProgressMessage) => void;
type ProgressCallbackThrottler = (callback: ProgressCallback) => ProgressCallback;
export const useProgressCallbackThrottler = (): ProgressCallbackThrottler => {
  const lastMessageRef = useRef<ProgressMessage | null>(null);
  const lastMessageTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((callback: ProgressCallback) => {
    const sendLatestMessage = () => {
      if (lastMessageRef.current) {
        callback(lastMessageRef.current);
        lastMessageTimeRef.current = Date.now();
        lastMessageRef.current = null;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    return (message: ProgressMessage) => {
      lastMessageRef.current = message;

      if (message.error || message.done) {
        sendLatestMessage();
        return;
      }

      if (!timeoutRef.current) {
        const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;
        const delay = Math.max(250 - timeSinceLastMessage, 0); // Throttle to at most 4 messages per second
        if (delay === 0) {
          sendLatestMessage();
        } else {
          timeoutRef.current = setTimeout(() => {
            sendLatestMessage();
          }, delay);
        }
      }
    };
  }, []);
};
