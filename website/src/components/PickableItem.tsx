import { useCallback, useState } from 'react';
import type { Item } from '../item/types';
import Slot from './Slot';
import Button from './Button';
import ItemPicker from './ItemPicker';
import DeleteButton from './DeleteButton';

interface PickableItemProps {
  className?: string;
  item?: Item;
  onItemChange?: (item?: Item) => void;
}

function PickableItem({
  className = '',
  item,
  onItemChange
}: PickableItemProps) {
  const [picking, setPicking] = useState(false);

  const handleItemChange = useCallback((item?: Item) => {
    onItemChange?.(item);
    setPicking(false);
  }, [onItemChange]);

  const onPickerBlur = useCallback(() => {
    setPicking(false);
  }, []);

  return (
    <div className={`relative w-96 flex items-center space-x-2 overflow-visible ${className}`}>
      <Slot className="flex-none" item={item ?? undefined} />
      <div className="flex-1 font-pixel leading-none">{item?.display_name}</div>
      <Button
        className="bg-primary-600 hover:bg-primary-500"
        onClick={() => setPicking(true)}
      >
        set
      </Button>
      <DeleteButton
        onClick={() => handleItemChange(undefined)}
        disabled={!item}
      />
      <div className="absolute top-full z-10">
        {picking && <ItemPicker initialItem={item} onSelect={handleItemChange} onBlur={onPickerBlur} />}
      </div>
    </div>
  );
}

export default PickableItem;
