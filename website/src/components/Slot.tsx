import { memo, useCallback } from 'react';
import { getIconPath, IMAGE_PATHS } from '../image/util';
import type { Item } from '../item/types';
import { useInfoPanelStore, useTooltipStore } from '../stores';

interface SlotProps {
  className?: string;
  item?: Item;
  count?: number;
}

const Slot = memo(function Slot({ className, item, count }: SlotProps) {
  const stackable = (item?.stack_size ?? 1) > 1;

  const setPanelItem = useInfoPanelStore((state) => state.viewItem);
  const setTooltipText = useTooltipStore((state) => state.setText);
  const handleClick = useCallback(() => {
    if (item) {
      setPanelItem(item);
    }
  }, [item, setPanelItem]);

  const handleMouseEnter = useCallback(() => {
    setTooltipText(item?.display_name ?? null);
  }, [item, setTooltipText]);

  const handleMouseLeave = useCallback(() => {
    setTooltipText(null);
  }, [setTooltipText]);

  return (
    <div
      className={`group relative size-icon shrink-0 cursor-pointer ${className ?? ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img src={IMAGE_PATHS.slot} className="absolute size-full pixelated opacity-100 group-hover:opacity-0" />
      <img src={IMAGE_PATHS.slot_hover} className="absolute size-full pixelated opacity-0 group-hover:opacity-100" />
      <div className="absolute inset-icon-1">
        {item && (
          <img src={`${getIconPath(item)}`} className="absolute size-full pixelated" />
        )}
      </div>
      <div className="absolute left-icon-1 bottom-icon-2 leading-none font-pixel text-icon text-shadow-[0_0_var(--spacing-icon-2)black]">
        {stackable && count}
      </div>
    </div>
  );
});

export default Slot;
