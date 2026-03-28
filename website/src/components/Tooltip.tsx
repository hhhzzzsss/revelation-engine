import { useEffect, useRef } from 'react';
import { useTooltipStore } from '../stores';

const X_OFFSET = 10;
const Y_OFFSET = 10;

function Tooltip() {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipText = useTooltipStore((state) => state.text);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      let left = e.clientX + X_OFFSET;
      let top = e.clientY + Y_OFFSET;

      if (left + tooltipRect.width > window.innerWidth) {
        left = e.clientX - tooltipRect.width - X_OFFSET;
      }
      if (top + tooltipRect.height > window.innerHeight) {
        top = e.clientY - tooltipRect.height - Y_OFFSET;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };
    
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={tooltipRef}
      className={`absolute px-1 bg-bg-700 border-2 border-fg-600 opacity-80 font-pixel z-20 pointer-events-none ${tooltipText ? 'block' : 'hidden'}`}
    >
      {tooltipText}
    </div>
  );
}

export default Tooltip;
