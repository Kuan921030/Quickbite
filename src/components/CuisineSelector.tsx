import React from 'react';

interface CuisineSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export const CuisineSelector = ({ value, onChange }: CuisineSelectorProps) => (
  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5" id="cuisine-selector">
    {['中式', '日式', '韓式', '美式', '東南亞', '義式', '法式', '其他'].map((label) => (
      <button
        key={label}
        onClick={() => onChange(label)}
        className={`py-3 px-1 rounded-xl border-2 transition-all text-xs sm:text-sm font-bold text-center select-none truncate ${
          value === label 
            ? 'bg-brand-primary border-brand-primary text-white shadow-lg scale-105' 
            : 'bg-white border-neutral-100 text-neutral-500 hover:border-brand-primary/30 cursor-pointer'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);
