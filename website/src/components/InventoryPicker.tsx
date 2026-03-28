import { useCallback, useMemo, useState } from 'react';
import type { Item } from '../item/types';
import { useItemData } from '../item/hooks';
import { compareItemsBySearchTerm, itemMatchesSearchTerm } from '../item/util';
import DeleteButton from './DeleteButton';
import Slot from './Slot';
import Input from './Input';
import { getIconPath } from '../image/util';
import Button from './Button';


interface InventoryPickerProps {
  className?: string;
  items: Item[];
  onItemsChange?: (items: Item[]) => void;
}
function InventoryPicker({ className, items, onItemsChange }: InventoryPickerProps) {
  const { data: itemData } = useItemData();
  const itemIdSet = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const sortedItems = useMemo(() => items.toSorted((a, b) => a.id - b.id), [items]);

  const handleDelete = (index: number) => {
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
      <div className="w-xl flex flex-col border-r-2 border-secondary-800">
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
        <div className="flex-1 pr-4 overflow-y-auto">
          {!items.length && (
            <div className="mt-4 text-center font-pixel text-fg-600">
              no items added<br />select items on the right
            </div>
          )}
          <ul className="grid grid-cols-2 gap-x-6">
            {items.map((item, index) => (
              <li key={item.id}>
                <InventoryItem
                  key={item.id}
                  item={item}
                  onDelete={() => handleDelete(index)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <InventoryItemPicker
        className="w-80 pl-4"
        itemData={itemData}
        filter={(item) => !itemIdSet.has(item.id)}
        onSelect={handleSelect}
      />
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
  filter: (item: Item) => boolean;
  onSelect?: (item: Item) => void;
}
function InventoryItemPicker({ className, itemData, filter, onSelect }: InventoryItemPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItemData = useMemo(() => {
    return itemData
      ?.filter(filter)
      ?.filter((item) => itemMatchesSearchTerm(searchTerm, item))
      ?.toSorted((a, b) => compareItemsBySearchTerm(searchTerm, a, b, false));
  }, [itemData, filter, searchTerm]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  }, []);

  return (
    <div className={`flex flex-col ${className}`}>
      <Input
        className="w-full mb-2"
        placeholder="search"
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <ul className="flex-1 overflow-y-auto">
        {filteredItemData?.map((item) => (
          <li
            key={item.id}
            className={'p-1 rounded-sm flex items-center space-x-2 hover:bg-bg-600 cursor-pointer'}
            onClick={() => onSelect?.(item)}
          >
            <img src={getIconPath(item)} alt={item.display_name} className="inline-block w-8 h-8 mr-2 pixelated" />
            <span className="font-pixel">{item.display_name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default InventoryPicker;
