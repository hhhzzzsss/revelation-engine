import { IMAGE_PATHS } from '../image/util';

interface FavoriteHeartProps extends React.HTMLAttributes<HTMLDivElement> {
  filled: boolean;
}

function FavoriteHeartButton({ className = '', filled, ...buttonProps }: FavoriteHeartProps) {
  return (
    <div className={`group relative size-heart p-0 border-none bg-transparent select-none ${className || ''}`} {...buttonProps}>
      <img src={IMAGE_PATHS.health_heart_empty} className="absolute size-full pixelated pointer-events-none" />
      <img src={IMAGE_PATHS.health_heart} className={`absolute size-full pixelated pointer-events-none ${filled ? 'opacity-100 group-hover:brightness-150' : 'opacity-0 group-hover:opacity-50'}`} />
    </div>
  );
}

export default FavoriteHeartButton;
