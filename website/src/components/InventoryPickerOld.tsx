import { useCallback, useMemo, useRef, useState } from 'react';
import type { Item, QuantifiedItem } from '../item/types';
import { useItemData } from '../item/hooks';
import { compareItemsBySearchTerm, itemMatchesSearchTerm } from '../item/util';
import IntRangeInput from './IntRangeInput';
import DeleteButton from './DeleteButton';
import Slot from './Slot';
import Input from './Input';
import { getIconPath } from '../image/util';


interface InventoryPickerProps {
  qItems: QuantifiedItem[];
  onQItemsChange?: (items: QuantifiedItem[]) => void;
}
function InventoryPicker({ qItems, onQItemsChange }: InventoryPickerProps) {
  const itemIdSet = useMemo(() => new Set(qItems.map((qItem) => qItem.item.id)), [qItems]);

  const handleQItemChange = (index: number, qItem: QuantifiedItem | null) => {
    const newItems = [...qItems];
    newItems[index] = qItem!;
    onQItemsChange?.(newItems);
  };

  const handleDelete = (index: number) => {
    const newItems = [...qItems];
    newItems.splice(index, 1);
    onQItemsChange?.(newItems);
  };

  const handleSelect = (item: Item) => {
    if (itemIdSet.has(item.id)) return;
    const newItems = [...qItems, { item, count: 999 }];
    onQItemsChange?.(newItems);
  };

  return (
    <div className="flex h-128">
      <ul className="w-96 pr-4 overflow-y-auto border-r-2 border-secondary-800">
        {!qItems.length && (
          <li className="mt-4 text-center font-pixel text-fg-600">
            no items added<br />select items on the right
          </li>
        )}
        {qItems.map((qItem, index) => (
          <li key={qItem.item.id}>
            <InventoryItem
              key={qItem.item.id}
              qItem={qItem}
              onQItemChange={(newQItem) => handleQItemChange(index, newQItem)}
              onDelete={() => handleDelete(index)}
            />
          </li>
        ))}
      </ul>
      <InventoryItemPicker
        filter={(item) => !itemIdSet.has(item.id)}
        onSelect={handleSelect}
      />
    </div>
  );
}

interface InventoryItemProps {
  qItem: QuantifiedItem | null;
  onQItemChange?: (qItem: QuantifiedItem | null) => void;
  onDelete?: () => void;
}
function InventoryItem({ qItem, onQItemChange, onDelete }: InventoryItemProps) {
  const shouldDisplayCount = qItem && (qItem.item.stack_size > 1 || qItem.count != 1);
  const displayedCount = shouldDisplayCount ? qItem?.count : undefined;

  const handleInputChange = useCallback((v: number) => {
    if (!qItem) return;
    onQItemChange?.({ item: qItem.item, count: v });
  }, [onQItemChange, qItem]);

  return (
    <div className="w-full flex items-center space-x-2 overflow-visible">
      <Slot className="flex-none" item={qItem?.item} count={displayedCount} />
      <div className="flex-1 font-pixel leading-none">{qItem?.item.display_name}</div>
      <IntRangeInput
        className="max-w-16"
        min={1}
        max={999}
        value={qItem?.count ?? 1}
        onChange={handleInputChange}
      />
      <DeleteButton
        onClick={() => onDelete?.()}
      />
    </div>
  );
}

interface InventoryItemPickerProps {
  filter: (item: Item) => boolean;
  onSelect?: (item: Item) => void;
}
function InventoryItemPicker({ filter, onSelect }: InventoryItemPickerProps) {
  const { data: itemData } = useItemData();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItemData = useMemo(() => {
    return itemData
      ?.filter(filter)
      ?.filter((item) => itemMatchesSearchTerm(searchTerm, item))
      ?.toSorted((a, b) => compareItemsBySearchTerm(searchTerm, a, b));
  }, [itemData, filter, searchTerm]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  }, []);

  return (
    <div className="w-80 p-4 flex flex-col">
      <Input
        ref={inputRef}
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
