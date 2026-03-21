import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  ref?: React.Ref<HTMLInputElement>;
  className?: string;
}

function Input({ ref, className, autoComplete='off', ...props }: InputProps) {
  return <input
    ref={ref}
    className={`p-2 bg-bg-600 font-pixel rounded-sm border-2 transition-colors border-secondary-800 focus:border-secondary-700 ${className ?? ''}`}
    autoComplete={autoComplete}
    {...props}
  />;
}

export default Input;
