import type { Item } from '../item/types';
import Slot from './Slot';

interface LabeledSlotProps {
  item?: Item;
  count?: number;
  capCount?: boolean;
}

function LabeledSlot({ item, count, capCount }: LabeledSlotProps) {
  return (
    <div className="w-64 flex items-center space-x-2 overflow-visible">
      <Slot className="flex-none" item={item} count={count} capCount={capCount} />
      <div className="flex-1 font-pixel leading-none">{item?.display_name}</div>
    </div>
  );
}

export default LabeledSlot;
