import React, { useCallback, useEffect, useRef, useState } from 'react';
import Input from './Input';

interface ValidatedInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

function ValidatedInput({
  className,
  value,
  onChange,
  min = 1,
  max = 50,
  ...props
}: ValidatedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [maskedValue, setMaskedValue] = useState<string | null>(null);

  const inputNormalizationFn = useCallback((v: string) => {
    const digitsOnly = v.replace(/\D/g, '');
    if (parseInt(digitsOnly, 10) > max) {
      return max.toString();
    }
    return digitsOnly;
  }, [max]);

  const validationFn = useCallback((v: string) => {
    const num = parseInt(v, 10);
    return !isNaN(num) && num >= min && num <= max;
  }, [min, max]);

  const normalizationFn = useCallback((v: string) => {
    const num = parseInt(v, 10);
    if (isNaN(num)) return min;
    if (num < min) return min;
    if (num > max) return max;
    return num;
  }, [min, max]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = inputNormalizationFn(e.target.value);
    if (validationFn(newValue)) {
      onChange(normalizationFn(newValue));
      setMaskedValue(null);
    } else {
      setMaskedValue(newValue);
    }
  }, [onChange, inputNormalizationFn, validationFn, normalizationFn]);

  const handleBlur = useCallback(() => {
    if (maskedValue !== null) {
      onChange(normalizationFn(maskedValue));
      setMaskedValue(null);
    }
  }, [maskedValue, onChange, normalizationFn]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (maskedValue !== null) {
        onChange(normalizationFn(maskedValue));
        setMaskedValue(null);
      } else {
        onChange(Math.min(value + 1, max));
      }
    } else if (e.key === 'ArrowDown') {
      if (maskedValue !== null) {
        e.preventDefault();
        onChange(normalizationFn(maskedValue));
        setMaskedValue(null);
      } else {
        onChange(Math.max(value - 1, min));
      }
    }
  }, [value, maskedValue, min, max, onChange, normalizationFn]);

  useEffect(() => {
    if (value < min) {
      onChange(min);
    } else if (value > max) {
      onChange(max);
    }
  }, [value, min, max, onChange]);

  return <Input
    ref={inputRef}
    value={maskedValue ?? value}
    onChange={handleChange}
    onBlur={handleBlur}
    onKeyDown={handleKeyDown}
    className={`no-spinner ${className ?? ''}`}
    {...props}
  />;
}

export default ValidatedInput;
