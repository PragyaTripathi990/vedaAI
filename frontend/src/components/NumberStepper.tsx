"use client";

import { Minus, Plus } from "lucide-react";

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 100,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="num-stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus size={14} className="mx-auto" />
      </button>
      <span className="tabular-nums font-semibold text-ink-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus size={14} className="mx-auto" />
      </button>
    </div>
  );
}
