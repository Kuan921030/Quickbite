import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

interface HurrySelectorProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export const HurrySelector = ({ value, onChange }: HurrySelectorProps) => (
  <button
    id="hurry-selector"
    onClick={() => onChange(!value)}
    className={`w-full py-4 px-6 rounded-2xl border-2 flex items-center justify-between transition-all ${
      value 
        ? 'bg-black border-black text-white shadow-xl' 
        : 'bg-white border-neutral-100 text-neutral-600'
    }`}
  >
    <div className="flex items-center gap-3">
      <Zap className={value ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-400'} size={24} />
      <div className="text-left">
        <p className="font-bold">我很趕時間</p>
        <p className="text-xs opacity-70">優先尋找快速出餐的選擇</p>
      </div>
    </div>
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${value ? 'border-white bg-white/20' : 'border-neutral-200'}`}>
      {value && <CheckCircle2 size={16} />}
    </div>
  </button>
);
