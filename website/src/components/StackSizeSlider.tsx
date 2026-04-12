import { useStackSizeStore } from '../stores';

interface StackSizeSliderProps {
  className?: string;
}

const possible_stack_sizes: number[] = [];
for (let i = 50; i < 100; i += 10) {
  possible_stack_sizes.push(i);
}
for (let i = 100; i < 1000; i += 25) {
  possible_stack_sizes.push(i);
}
possible_stack_sizes.push(999);

function StackSizeSlider({
  className = '',
}: StackSizeSliderProps) {
  const { maxStackSize, setMaxStackSize } = useStackSizeStore();
  const stackSizeIndex = possible_stack_sizes.findIndex((s) => s >= maxStackSize);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    setMaxStackSize(possible_stack_sizes[idx]);
  };

  const handleDecrement = () => {
    const newIndex = Math.max(0, stackSizeIndex - 1);
    setMaxStackSize(possible_stack_sizes[newIndex]);
  };

  const handleIncrement = () => {
    const newIndex = Math.min(possible_stack_sizes.length - 1, stackSizeIndex + 1);
    setMaxStackSize(possible_stack_sizes[newIndex]);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-pixel">max stack size:</span>
      <button
        className="inline-block mb-1 font-pixel leading-0 text-icon text-severe-600 hover:text-severe-500 cursor-pointer"
        onClick={handleDecrement}
      >
        -
      </button>
      <input
        className="w-48 slider"
        type="range"
        min={0}
        max={possible_stack_sizes.length - 1}
        value={stackSizeIndex}
        onChange={handleChange}
      />
      <button
        className="inline-block mb-1 font-pixel leading-0 text-icon text-primary-600 hover:text-primary-500 cursor-pointer"
        onClick={handleIncrement}
      >
        +
      </button>
      <span className="font-pixel">{maxStackSize}</span>
    </div>
  );
}

export default StackSizeSlider;
