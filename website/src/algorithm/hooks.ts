import { useMemo } from 'react';
import { useFuserParameters, useItemData } from '../item/hooks';
import { getApotheosisBatchSolver } from './apotheosisBatchSolver';
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
