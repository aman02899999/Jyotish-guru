"use client";

import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
}

export function ChipSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
              isSelected
                ? "border-saffron bg-saffron text-ink"
                : "border-clay/30 bg-paper/50 text-clay hover:border-saffron/50"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
