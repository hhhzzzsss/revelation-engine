interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button
      className={`px-2 py-1 rounded-sm font-pixel ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
