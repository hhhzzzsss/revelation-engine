import Button from './Button';

interface ToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  toggled: boolean;
  onToggle: () => void;
}

export function ToggleButton({
  children,
  className = '',
  toggled,
  onToggle,
  ...props
}: ToggleButtonProps) {
  return (
    <Button
      className={`${toggled ? 'bg-primary-600 hover:bg-primary-500' : 'bg-secondary-700 text-fg-600 opacity-60 hover:opacity-100'} ${className}`}
      onClick={onToggle}
      {...props}
    >
      {children}
    </Button>
  );
}