import Button, { type ButtonProps } from './Button';

function DeleteButton({className, ...props}: ButtonProps) {
  return (
    <Button
      className={`bg-severe-500 enabled:hover:bg-severe-400 ${className ?? ''}`}
      {...props}
    >
      x
    </Button>
  );
}

export default DeleteButton;
