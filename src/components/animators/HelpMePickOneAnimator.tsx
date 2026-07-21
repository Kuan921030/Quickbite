import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MapPin, X, Flame, Check, RefreshCw } from 'lucide-react';
import { Restaurant } from '../../types/index';
import { calculateDistanceInMeters, getFriendlyDistanceText } from '../../utils/index';

interface HelpMePickOneAnimatorProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  userCoords: { lat: number; lng: number } | null;
  onSelectRestaurant: (r: Restaurant) => void;
}

export function HelpMePickOneAnimator({
  isOpen,
  onClose,
  restaurants,
  userCoords,
  onSelectRestaurant,
}: HelpMePickOneAnimatorProps) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Particle decoration for the celebration
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  useEffect(() => {
    if (!isOpen || restaurants.length === 0) {
      setPhase('idle');
      setHighlightedIndex(-1);
      setSelectedIndex(-1);
      setParticles([]);
      return;
    }

    // Determine target index randomly with equal probability (1/3)
    const targetIdx = Math.floor(Math.random() * restaurants.length);
    setSelectedIndex(targetIdx);

    setPhase('spinning');
    setHighlightedIndex(0);

    let delay = 50;
    let currentIdx = 0;
    let cycles = 0;
    const minCycles = 12; // Minimum cycles before stop to build tension

    const tick = () => {
      // Advance highlight index
      currentIdx = (currentIdx + 1) % restaurants.length;
      setHighlightedIndex(currentIdx);
      cycles++;

      // When we are past the min cycles and land on the selected target index, we stop!
      if (cycles > minCycles && currentIdx === targetIdx) {
        setPhase('result');
        
        // Generate party confetti/sparkle particles radiating from center
        const colors = ['#FF5C00', '#FF8A00', '#F59E0B', '#10B981', '#3B82F6', '#EC4899'];
        const list: any[] = [];
        for (let i = 0; i < 35; i++) {
          const angle = Math.random() * Math.PI * 2;
          const velocity = 50 + Math.random() * 100;
          list.push({
            id: i,
            x: Math.cos(angle) * velocity,
            y: Math.sin(angle) * velocity,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }
        setParticles(list);
        return;
      }

      // Decelerate speed gradually
      delay = delay + (cycles * 1.5);
      setTimeout(tick, delay);
    };

    const spinTimeout = setTimeout(tick, delay);

    return () => {
      clearTimeout(spinTimeout);
    };
  }, [isOpen, restaurants]);

  if (!isOpen || restaurants.length === 0) return null;

  const labels = ['🔥 超快速吃完', '🛡️ 保守安全牌', '✨ 探索新口味'];
  const labelColors = [
    'bg-red-500/10 text-red-400 border-red-500/20',
    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative w-full max-w-sm bg-gradient-to-b from-neutral-900 to-neutral-950 text-white rounded-[2.5rem] p-6 shadow-2xl border border-neutral-800 flex flex-col items-center overflow-hidden"
        >
          {/* Close button */}
          {phase === 'result' && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}

          {/* Sparkles icon at the top */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl animate-spin" style={{ animationDuration: '3s' }}>🎰</span>
            <span className="text-xs text-[#FF8A00] font-black tracking-widest uppercase">
              shortlist decision helper
            </span>
          </div>

          <h3 className="text-xl font-black text-white text-center tracking-tight mb-6">
            {phase === 'spinning' ? '吃貨之輪轉動中...' : '🎉 系統已為您做出決策！'}
          </h3>

          {/* Three Stacked Shuffling/Highlighting Cards */}
          <div className="w-full space-y-3.5 relative">
            {restaurants.map((r, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = idx === selectedIndex;
              const isFinalStop = phase === 'result';

              return (
                <motion.div
                  key={r.restaurantId}
                  animate={{
                    scale: isHighlighted ? 1.03 : 0.97,
                    opacity: isHighlighted ? 1 : 0.45,
                    y: isHighlighted ? -2 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors duration-200 relative overflow-hidden ${
                    isFinalStop && isSelected
                      ? 'bg-neutral-800/80 border-[#FF8A00] shadow-xl shadow-[#FF8A00]/10'
                      : isHighlighted
                      ? 'bg-neutral-800/40 border-neutral-600'
                      : 'bg-neutral-900/40 border-neutral-800'
                  }`}
                >
                  {/* Glowing halo for chosen one when stopped */}
                  {isFinalStop && isSelected && (
                    <div className="absolute inset-0 bg-[#FF8A00]/5 animate-pulse" />
                  )}

                  <div className="flex items-center gap-3 min-w-0 z-10">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={r.image}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 text-left">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border inline-block mb-1 ${labelColors[idx]}`}>
                        {labels[idx]}
                      </span>
                      <h4 className="font-bold text-sm text-neutral-100 truncate">
                        {r.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {getFriendlyDistanceText(calculateDistanceInMeters(r.coordinates, userCoords))} · {r.genre}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 z-10 pr-1">
                    {isFinalStop && isSelected ? (
                      <div className="w-6 h-6 bg-gradient-to-tr from-[#FF5C00] to-orange-400 rounded-full flex items-center justify-center text-white shadow-md animate-bounce">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    ) : (
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isHighlighted ? 'border-neutral-400' : 'border-neutral-800'
                      }`}>
                        {isHighlighted && <div className="w-2.5 h-2.5 bg-neutral-400 rounded-full" />}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Radiant Confetti Burst overlay around the center chosen card */}
            {phase === 'result' && particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: -40, scale: 0.1, opacity: 1 }}
                animate={{
                  x: p.x,
                  y: p.y - 40,
                  scale: [0.1, 1.2, 0.5],
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: 1.2,
                  ease: 'easeOut',
                }}
                className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full pointer-events-none z-30"
                style={{ backgroundColor: p.color }}
              />
            ))}
          </div>

          {/* Reveal & Action Section */}
          <AnimatePresence>
            {phase === 'result' && selectedIndex !== -1 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                className="w-full text-center space-y-4 mt-6 z-10"
              >
                <p className="text-xs font-bold text-neutral-400 leading-relaxed px-4">
                  「 既然三個都很棒，那這家就是上天在這一秒替您做出的完美選擇！ 」
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => onSelectRestaurant(restaurants[selectedIndex])}
                    className="w-full py-4 bg-gradient-to-r from-brand-primary to-[#FF8A00] hover:from-[#FF6C15] hover:to-orange-500 text-white rounded-2xl font-black text-sm tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                    id="pick-confirm-btn"
                  >
                    <Flame size={16} fill="currentColor" />
                    就是它了！立刻出發 ➔
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Restart the spin
                        setPhase('idle');
                        setHighlightedIndex(-1);
                        setSelectedIndex(-1);
                        setParticles([]);
                      }}
                      className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={12} />
                      不滿意？重選一次
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                    >
                      我自己再看
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
