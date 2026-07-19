import React from 'react';

interface DistanceSelectorProps {
  value: number;
  onChange: (v: number) => void;
}

export const DistanceSelector = ({ value, onChange }: DistanceSelectorProps) => (
  <div className="grid grid-cols-3 gap-1.5" id="distance-selector">
    {['100m', '500m', '~1km'].map((label, index) => (
      <button
        key={index}
        onClick={() => onChange(index)}
        className={`py-3 px-2 rounded-xl border-2 transition-all text-sm font-bold text-center select-none truncate ${
          value === index 
            ? 'bg-brand-primary border-brand-primary text-white shadow-lg scale-105' 
            : 'bg-white border-neutral-100 text-neutral-500 hover:border-brand-primary/30 cursor-pointer'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);
