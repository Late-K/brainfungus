"use client";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortControlsProps<T extends string> {
  id: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SortOption<T>>;
  label?: string;
}

export default function SortControls<T extends string>({
  id,
  value,
  onChange,
  options,
  label = "Sort by",
}: SortControlsProps<T>) {
  return (
    <div className="sort-controls">
      <label htmlFor={id} className="sort-label">
        {label}
      </label>
      <select
        id={id}
        className="input sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
