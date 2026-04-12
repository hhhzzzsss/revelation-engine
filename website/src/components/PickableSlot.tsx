import { useCallback, useState } from 'react';
import type { Item, QuantifiedItem } from '../item/types';
import Slot from './Slot';
import Button from './Button';
import ItemPicker from './ItemPicker';
import IntRangeInput from './IntRangeInput';
import DeleteButton from './DeleteButton';
import { useStackSizeStore } from '../stores';
import { getStackSize } from '../item/util';

interface PickableSlotProps {
  qItem: QuantifiedItem | null;
  onQItemChange?: (qItem: QuantifiedItem | null) => void;
}

function PickableSlot({ qItem, onQItemChange }: PickableSlotProps) {
  const [picking, setPicking] = useState(false);
  const maxStackSize = useStackSizeStore((state) => state.maxStackSize);

  const stackSize = qItem ? getStackSize(qItem.item, maxStackSize) : 0;
  const stackable = stackSize > 1;

  const handleInputChange = useCallback((v: number) => {
    if (!qItem) return;
    onQItemChange?.({ item: qItem.item, count: v });
  }, [onQItemChange, qItem]);

  const onItemChange = useCallback((item: Item) => {
    onQItemChange?.({ item, count: qItem?.count ?? 1 });
    setPicking(false);
  }, [onQItemChange, qItem]);

  const onPickerBlur = useCallback(() => {
    setPicking(false);
  }, []);

  return (
    <div className="relative w-108 flex items-center space-x-2 overflow-visible">
      <Slot className="flex-none" item={qItem?.item} count={qItem?.count} />
      <div className="flex-1 font-pixel leading-none">{qItem?.item.display_name}</div>
      {stackable && <IntRangeInput
        className="max-w-15"
        min={1}
        max={stackSize}
        value={qItem?.count ?? 1}
        onChange={handleInputChange}
      />}
      <Button
        className="bg-primary-600 hover:bg-primary-500"
        onClick={() => setPicking(true)}
      >
        set
      </Button>
      <DeleteButton
        onClick={() => onQItemChange?.(null)}
        disabled={!qItem}
      />
      <div className="absolute top-full z-10">
        {picking && <ItemPicker initialItem={qItem?.item} onSelect={onItemChange} onBlur={onPickerBlur} />}
      </div>
    </div>
  );
}

export default PickableSlot;
