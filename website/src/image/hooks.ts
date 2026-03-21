import { useEffect, useRef } from 'react';
import { useItemData } from '../item/hooks';
import type { Item } from '../item/types';
import { getIconPath, IMAGE_PATHS } from './util';

export const useImagePreload = () => {
  const iconsRef = useRef<HTMLImageElement[]>([]);
  const { data: itemData } = useItemData();
  useEffect(() => {
    if (!itemData) return;

    iconsRef.current = [];

    const preloadImage = (src: string) => {
      const img = new Image();
      img.src = src;
      iconsRef.current.push(img);
    };
    
    // Item icons
    itemData.forEach((item: Item) => preloadImage(getIconPath(item)));

    // Other images
    Object.values(IMAGE_PATHS).forEach((path: string) => preloadImage(path));
  }, [itemData]);
};
