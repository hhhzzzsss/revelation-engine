import type { QuantifiedItem } from '../item/types';
import Slot from './Slot';

interface LabeledSlotProps {
  qItem: QuantifiedItem | null;
}

function LabeledSlot({ qItem }: LabeledSlotProps) {
  return (
    <div className="w-72 flex items-center space-x-2 overflow-visible">
      <Slot qItem={qItem} />
      <div className="flex-1 font-pixel leading-none">{qItem?.item.display_name}</div>
    </div>
  );
}

export default LabeledSlot;
