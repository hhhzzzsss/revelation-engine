import { useQuery } from '@tanstack/react-query';
import type { FuserParameters, Item } from './types';
import fuserParamUrl from '../assets/fuser_params.json?url';
import itemDataUrl from '../assets/item_data.json?url';

export const useFuserParameters = () => {
  return useQuery({
    queryKey: ['fuserParameters'],
    queryFn: async () => {
      const response = await fetch(fuserParamUrl);
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
      const response = await fetch(itemDataUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch item data');
      }
      return await response.json() as Item[];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
