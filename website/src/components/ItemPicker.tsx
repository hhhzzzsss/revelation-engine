import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Item } from '../item/types';
import { useItemData } from '../item/hooks';
import { compareItemsBySearchTerm, itemMatchesSearchTerm } from '../item/util';
import { getIconPath } from '../image/util';
import Input from './Input';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ItemPickerProps {
  initialItem?: Item;
  onSelect?: (item: Item) => void;
  onBlur?: () => void;
  filter?: (item: Item) => boolean;
}

function ItemPicker({
  initialItem,
  onSelect,
  onBlur,
  filter = () => true,
}: ItemPickerProps) {
  const { data: itemData } = useItemData();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSelectedItem, setUserSelectedItem] = useState<Item | null>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter and sort items based on search term
  const filteredItemData = useMemo(() => {
    return itemData
      ?.filter(filter)
      ?.filter((item) => itemMatchesSearchTerm(searchTerm, item))
      .toSorted((a, b) => compareItemsBySearchTerm(searchTerm, a, b));
  }, [itemData, searchTerm, filter]);

  // Virtualizer for item list
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredItemData?.length ?? 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => 40,
  });

  // Determine selected item
  const unfilteredSelectedItem = userSelectedItem || initialItem;
  const selectedItem = itemMatchesSearchTerm(searchTerm, unfilteredSelectedItem) ? unfilteredSelectedItem : filteredItemData?.[0] ?? null;
  const selectedItemVisible = filteredItemData?.some((item) => item.id === selectedItem?.id) ?? false;

  // Scroll to selected item
  useEffect(() => {
    const selectedItemIdx = filteredItemData?.findIndex((item) => item.id === selectedItem?.id) ?? -1;
    if (selectedItemIdx >= 0) {
      rowVirtualizer.scrollToIndex(selectedItemIdx);
    }
  }, [rowVirtualizer, filteredItemData, selectedItem]);

  // Handle search input changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  }, []);

  // Handle key presses
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (!filteredItemData) return;

    const getSelectedIdx = () => filteredItemData.findIndex((item) => item.id === selectedItem?.id);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx =Math.min(getSelectedIdx() + 1, filteredItemData.length - 1);
      setUserSelectedItem(filteredItemData[nextIdx]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = Math.max(getSelectedIdx() - 1, 0);
      setUserSelectedItem(filteredItemData[prevIdx]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedItem && selectedItemVisible) {
        onSelect?.(selectedItem);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }, [onSelect, filteredItemData, selectedItem, selectedItemVisible]);
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  // Block pointer events on container when input is focused
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (document.activeElement === inputRef.current) {
        e.preventDefault();
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  // Handle input blur
  useEffect(() => {
    if (!onBlur) return;
    const inputEl = inputRef.current;

    inputEl?.addEventListener('blur', onBlur);
    return () => {
      inputEl?.removeEventListener('blur', onBlur);
    };
  }, [onBlur]);

  return (
    <div
      ref={containerRef}
      className="w-96 h-96 p-2 flex flex-col bg-bg-500 border-2 rounded-md border-secondary-700 select-none"
    >
      <Input
        ref={inputRef}
        className="w-full mb-2"
        placeholder="search"
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <div ref={listRef} className="flex-1 w-full overflow-y-auto">
        <div
          style={{ 'height': `${rowVirtualizer.getTotalSize()}px` }}
          className="relative w-full"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = filteredItemData?.[virtualRow.index];
            if (!item) return null;
            return (
              <div
                key={item.id}
                className={`absolute top-0 left-0 w-full min-w-0 rounded-sm flex items-center space-x-2  hover:bg-bg-600 ${selectedItem?.id === item.id ? 'bg-bg-600' : ''}`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onSelect?.(item)}
              >
                <img src={getIconPath(item)} alt={item.display_name} className="inline-block w-8 h-8 mr-2 pixelated" />
                <span className="font-pixel">{item.display_name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ItemPicker;
