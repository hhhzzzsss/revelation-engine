import { useCallback, useMemo, useRef, useState } from 'react';
import type { Item } from '../item/types';
import { useItemData } from '../item/hooks';
import { compareItemsBySearchTerm, itemMatchesSearchTerm } from '../item/util';
import DeleteButton from './DeleteButton';
import Slot from './Slot';
import Input from './Input';
import { getIconPath } from '../image/util';
import Button from './Button';
import { useVirtualizer } from '@tanstack/react-virtual';


interface InventoryPickerProps {
  className?: string;
  items: Item[];
  onItemsChange?: (items: Item[]) => void;
}
function InventoryPicker({ className, items, onItemsChange }: InventoryPickerProps) {
  const { data: itemData } = useItemData();
  const [searchTerm, setSearchTerm] = useState('');

  const itemIdSet = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const sortedItems = useMemo(() => items.toSorted((a, b) => compareItemsBySearchTerm(searchTerm, a, b, false)), [items, searchTerm]);

  const handleDelete = (item: Item) => {
    const index = sortedItems.findIndex((i) => i.id === item.id);
    if (index === -1) return;
    const newItems = [...sortedItems];
    newItems.splice(index, 1);
    onItemsChange?.(newItems);
  };

  const handleSelect = (item: Item) => {
    if (itemIdSet.has(item.id)) return;
    const newItems = [...sortedItems, item];
    onItemsChange?.(newItems);
  };

  const handleSelectAll = () => {
    if (!itemData) return;
    const newItems = [...itemData];
    onItemsChange?.(newItems);
  };

  const handleDeselectAll = () => {
    onItemsChange?.([]);
  };

  return (
    <div className={`flex h-128 ${className}`}>
      <div className="w-150 flex flex-col border-r-2 border-secondary-800">
        <div className="pr-4 mb-2 flex justify-end space-x-2">
          <Button
            className="bg-primary-600 hover:bg-primary-500"
            onClick={handleSelectAll}
          >
            select all
          </Button>
          <Button
            className="bg-secondary-700 hover:bg-secondary-600"
            onClick={handleDeselectAll}
          >
            deselect all
          </Button>
        </div>
        <InventoryItemDisplay
          items={sortedItems}
          onDelete={handleDelete}
        />
      </div>
      
      <InventoryItemPicker
        className="w-80 pl-4"
        itemData={itemData}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        filter={(item) => !itemIdSet.has(item.id)}
        onSelect={handleSelect}
      />
    </div>
  );
}

interface InventoryItemDisplayProps {
  className?: string;
  items: Item[];
  onDelete: (item: Item) => void;
}
function InventoryItemDisplay({ className, items, onDelete }: InventoryItemDisplayProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 80,
    lanes: 2,
  });

  return (
    <div ref={listRef} className={`overflow-y-auto ${className}`}>
      {!items.length && (
        <div className="mt-4 text-center font-pixel text-fg-600">
          no items added<br />select items on the right
        </div>
      )}
      <div
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        className="relative w-full"
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;
          return (
            <div
              key={item.id}
              className="absolute top-0 w-1/2 min-w-0 pr-4"
              style={{
                left: `${virtualRow.lane * 50}%`,
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <InventoryItem
                item={item}
                onDelete={() => onDelete(item)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface InventoryItemProps {
  item: Item;
  onDelete?: () => void;
}
function InventoryItem({ item, onDelete }: InventoryItemProps) {
  return (
    <div className="w-full flex items-center space-x-2 overflow-visible">
      <Slot className="flex-none" item={item} />
      <div className="flex-1 font-pixel leading-none">{item.display_name}</div>
      <DeleteButton
        onClick={() => onDelete?.()}
      />
    </div>
  );
}

interface InventoryItemPickerProps {
  className?: string;
  itemData?: Item[];
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  filter: (item: Item) => boolean;
  onSelect?: (item: Item) => void;
}
function InventoryItemPicker({
  className,
  itemData,
  searchTerm='',
  onSearchTermChange,
  filter,
  onSelect
}: InventoryItemPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItemData = useMemo(() => {
    return itemData
      ?.filter(filter)
      ?.filter((item) => itemMatchesSearchTerm(searchTerm, item))
      ?.toSorted((a, b) => compareItemsBySearchTerm(searchTerm, a, b, false));
  }, [itemData, filter, searchTerm]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredItemData?.length ?? 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => 40,
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchTermChange?.(e.target.value.toLowerCase());
  }, [onSearchTermChange]);

  return (
    <div className={`flex flex-col ${className}`}>
      <Input
        className="w-full mb-2"
        placeholder="search"
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <div ref={listRef} className="flex-1 overflow-y-auto">
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
                className="absolute top-0 left-0 w-full min-w-0 rounded-sm flex items-center space-x-2  hover:bg-bg-600 cursor-pointer"
                style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
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

export default InventoryPicker;
