import { IMAGE_PATHS } from '../image/util';
import { useTooltipStore } from '../stores';

interface FavoriteHeartProps {
  className?: string;
  filled: boolean;
  onClick: () => void;
}

function FavoriteHeartButton({ className = '', filled, ...buttonProps }: FavoriteHeartProps) {
  const setTooltipText = useTooltipStore((state) => state.setText);

  const handleMouseEnter = () => {
    setTooltipText(filled ? 'unfavorite' : 'favorite');
  };

  const handleMouseLeave = () => {
    setTooltipText(null);
  };

  const handleClick = () => {
    buttonProps.onClick();
    setTooltipText(null);
  };

  return (
    <div
      className={`group relative size-heart p-0 border-none bg-transparent select-none ${className || ''}`} {...buttonProps}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <img src={IMAGE_PATHS.health_heart_empty} className="absolute size-full pixelated pointer-events-none" />
      <img src={IMAGE_PATHS.health_heart} className={`absolute size-full pixelated pointer-events-none ${filled ? 'opacity-100 group-hover:brightness-150' : 'opacity-0 group-hover:opacity-50'}`} />
    </div>
  );
}

export default FavoriteHeartButton;
