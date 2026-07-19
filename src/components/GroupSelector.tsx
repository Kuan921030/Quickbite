import React from 'react';

interface GroupSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export const GroupSelector = ({ value, onChange }: GroupSelectorProps) => (
  <div className="flex gap-2" id="group-selector">
    {['一人食', '約會', '朋友聚餐'].map((type) => (
      <button
        key={type}
        onClick={() => onChange(type)}
        className={`flex-1 py-3 px-2 rounded-xl border-2 transition-all ${
          value === type 
            ? 'bg-brand-secondary border-brand-secondary text-white shadow-lg scale-105' 
            : 'bg-white border-neutral-100 text-neutral-500 hover:border-brand-secondary/30'
        }`}
      >
        <span className="text-sm font-medium">{type}</span>
      </button>
    ))}
  </div>
);
