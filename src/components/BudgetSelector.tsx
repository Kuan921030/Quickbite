import React from 'react';

interface BudgetSelectorProps {
  value: number;
  onChange: (v: number) => void;
}

export const BudgetSelector = ({ value, onChange }: BudgetSelectorProps) => (
  <div className="grid grid-cols-3 gap-1.5" id="budget-selector">
    {['~100', '~300', '~600'].map((label, index) => (
      <button
        key={index}
        onClick={() => onChange(index)}
        className={`py-3 px-1 rounded-xl border-2 transition-all text-xs sm:text-sm font-bold text-center select-none truncate ${
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
