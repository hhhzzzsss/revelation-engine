import { getIconPath, IMAGE_PATHS } from '../image/util';
import type { QuantifiedItem } from '../item/types';

interface SlotProps {
  className?: string;
  qItem: QuantifiedItem | null;
}

function Slot({ className, qItem }: SlotProps) {
  const stackable = (qItem?.item.stack_size ?? 1) > 1;

  return (
    <div className={`group relative size-icon ${className ?? ''}`}>
      <img src={IMAGE_PATHS.slot} className="absolute size-full pixelated opacity-100 group-hover:opacity-0" />
      <img src={IMAGE_PATHS.slot_hover} className="absolute size-full pixelated opacity-0 group-hover:opacity-100" />
      <div className="absolute inset-icon-1">
        {qItem?.item && (
          <img src={`${getIconPath(qItem.item)}`} className="absolute size-full pixelated" />
        )}
      </div>
      <div className="absolute left-icon-1 bottom-icon-2 leading-none font-pixel text-icon text-shadow-[0_0_var(--spacing-icon-2)black]">
        {stackable && qItem?.count}
      </div>
    </div>
  );
}

export default Slot;
