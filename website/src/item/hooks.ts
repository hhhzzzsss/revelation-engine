import { useQuery } from '@tanstack/react-query';
import type { FuserParameters, Item } from './types';
import { useMemo } from 'react';
import ApotheosisSolver from './apotheosisSolver';

export const useFuserParameters = () => {
  return useQuery({
    queryKey: ['fuserParameters'],
    queryFn: async () => {
      const response = await fetch('/fuser_params.json');
      if (!response.ok) {
        throw new Error('Failed to fetch fuser parameters');
      }
      return await response.json() as FuserParameters;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

export const useItemData = () => {
  return useQuery({
    queryKey: ['itemData'],
    queryFn: async () => {
      const response = await fetch('/item_data.json');
      if (!response.ok) {
        throw new Error('Failed to fetch item data');
      }
      return await response.json() as Item[];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

export const useApotheosisSolver = () => {
  const { data: fuserParams } = useFuserParameters();
  const { data: itemData } = useItemData();
  return useMemo(() => {
    if (!fuserParams || !itemData) return null;
    return new ApotheosisSolver(fuserParams, itemData);
  }, [fuserParams, itemData]);
};
