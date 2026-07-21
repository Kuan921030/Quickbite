import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MapPin, Clock, ArrowRight, RefreshCw, X, ShoppingCart } from 'lucide-react';
import { Restaurant } from '../../types/index';
import { restaurantRepository } from '../../repositories/restaurantRepository';
import { calculateDistanceInMeters, getFriendlyDistanceText } from '../../utils/index';

interface HelpMeDecideAnimatorProps {
  isOpen: boolean;
  onClose: () => void;
  targetRestaurant: Restaurant | null;
  userCoords: { lat: number; lng: number } | null;
  onSelectRestaurant: (r: Restaurant) => void;
  onOpenMenu: (r: Restaurant) => void;
  onRerun: () => void;
}

const steps = [
  '🔍 正在搜尋您周邊的餐飲店家...',
  '📋 正在比對今日篩選條件設定...',
  '🚫 正在過濾不合胃口的冷清配方...',
  '⭐ 正在權衡顧客評分與真實評價...',
  '🚶 正在精密估算步行與抵達時間...',
  '🎯 正在為您挑選今日最完美的一餐...'
];

export function HelpMeDecideAnimator({
  isOpen,
  onClose,
  targetRestaurant,
  userCoords,
  onSelectRestaurant,
  onOpenMenu,
  onRerun,
}: HelpMeDecideAnimatorProps) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'scrolling' | 'result'>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scrollRestaurant, setScrollRestaurant] = useState<Restaurant | null>(null);

  const allRestaurants = restaurantRepository.getAllRestaurants();

  useEffect(() => {
    if (!isOpen || !targetRestaurant) {
      setPhase('idle');
      return;
    }

    // Start Phase 1: Progressive loading messages (0 - 500ms)
    setPhase('loading');
    setCurrentStepIndex(0);
    setScrollRestaurant(null);

    // Speed up stepping so it cycles all 6 messages over 500ms
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 80);

    const transitionToScrollTimeout = setTimeout(() => {
      clearInterval(stepInterval);
      
      // Phase 2: Rapid scrolling (500ms - 1300ms)
      setPhase('scrolling');
      
      let delay = 35;
      let elapsed = 0;
      const tick = () => {
        if (elapsed >= 800) {
          // Phase 3: Stop on the final target restaurant
          setPhase('result');
          setScrollRestaurant(targetRestaurant);
          return;
        }

        // Pick a random restaurant that is NOT the target (to avoid early stop visual confusion)
        const candidates = allRestaurants.filter(r => r.restaurantId !== targetRestaurant.restaurantId);
        const rand = candidates[Math.floor(Math.random() * candidates.length)] || targetRestaurant;
        setScrollRestaurant(rand);

        elapsed += delay;
        delay = Math.min(220, delay * 1.15); // Decelerate scroll
        setTimeout(tick, delay);
      };

      tick();
    }, 550);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(transitionToScrollTimeout);
    };
  }, [isOpen, targetRestaurant]);

  if (!isOpen || !targetRestaurant) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md"
        />

        {/* Animation & Result Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
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

          {/* Decorative Top Accent */}
          <div className="w-12 h-1.5 bg-neutral-800 rounded-full mb-6" />

          {/* Phase 1: Progressive Status Messages */}
          {phase === 'loading' && (
            <div className="w-full flex flex-col items-center justify-center py-12 space-y-6 text-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 border-4 border-orange-500/20 rounded-full animate-ping" />
                <div className="w-16 h-16 bg-gradient-to-tr from-[#FF5C00] to-orange-400 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <RefreshCw size={28} className="animate-spin text-white" />
                </div>
              </div>

              <div className="space-y-4 px-2">
                <h3 className="text-lg font-black text-neutral-200 tracking-wide">
                  吃貨大腦精密計算中...
                </h3>
                <div className="h-12 flex items-center justify-center">
                  <motion.p
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-extrabold text-[#FF8A00] leading-relaxed"
                  >
                    {steps[currentStepIndex]}
                  </motion.p>
                </div>
              </div>
            </div>
          )}

          {/* Phase 2: Scrolling candidates */}
          {phase === 'scrolling' && scrollRestaurant && (
            <div className="w-full flex flex-col items-center justify-center py-8 space-y-6 text-center">
              <span className="text-xs bg-[#FFF3EB] text-[#FF5C00] font-black px-3 py-1 rounded-full border border-orange-200/10 shadow-sm inline-block">
                🎲 正在高速篩選名單...
              </span>

              {/* Shuffling mini-card representation */}
              <motion.div
                key={scrollRestaurant.restaurantId}
                initial={{ opacity: 0.6, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-neutral-800/60 p-4 rounded-3xl border border-neutral-700/50 space-y-3 shadow-lg"
              >
                <div className="w-full h-24 rounded-2xl overflow-hidden relative">
                  <img
                    src={scrollRestaurant.image}
                    alt={scrollRestaurant.name}
                    className="w-full h-full object-cover grayscale opacity-50"
                  />
                  <div className="absolute inset-0 bg-neutral-900/40" />
                </div>
                <h4 className="text-lg font-bold text-neutral-100 truncate">
                  {scrollRestaurant.name}
                </h4>
                <p className="text-xs text-neutral-400">
                  {scrollRestaurant.genre} · {scrollRestaurant.location}
                </p>
              </motion.div>
            </div>
          )}

          {/* Phase 3: Stop & Reveal final chosen restaurant */}
          {phase === 'result' && scrollRestaurant && (
            <div className="w-full space-y-6 text-center py-2">
              <motion.div
                initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-[#FF8A00] border border-orange-500/20 text-xs font-black shadow-inner"
              >
                <Sparkles size={14} className="fill-current" />
                吃貨之魂今日欽定
              </motion.div>

              {/* Satisfying Scale-Up Reveal Card */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
                className="w-full bg-neutral-800/40 p-4 rounded-3xl border border-[#FF8A00] space-y-4 shadow-xl shadow-[#FF8A00]/5 relative overflow-hidden"
              >
                {/* Subtle outer neon pulse border */}
                <div className="absolute inset-0 border border-[#FF8A00] rounded-3xl animate-pulse opacity-50" />

                {/* Premium Image Frame */}
                <div className="w-full h-36 rounded-2xl overflow-hidden relative">
                  <img
                    src={scrollRestaurant.image}
                    alt={scrollRestaurant.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white text-[11px] font-bold flex items-center gap-1.5 bg-neutral-950/60 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-neutral-800">
                    <span>約 {scrollRestaurant.estimatedDiningTime} 分鐘</span>
                    <span>•</span>
                    <span>
                      {getFriendlyDistanceText(
                        calculateDistanceInMeters(scrollRestaurant.coordinates, userCoords)
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-center px-1">
                  <h3 className="text-xl font-black text-white leading-snug drop-shadow-sm flex items-center justify-center gap-1">
                    🍜 {scrollRestaurant.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {scrollRestaurant.location} · {scrollRestaurant.genre}
                  </p>
                </div>
              </motion.div>

              <p className="text-xs font-bold text-neutral-400">
                ✨ 專屬推薦已誕生，出餐速度與評價完美匹配！
              </p>

              {/* Action Stack */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onOpenMenu(scrollRestaurant)}
                  className="w-full py-4 bg-[#FF5C00] hover:bg-[#FF6C15] text-white rounded-2xl font-black text-sm tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <ShoppingCart size={16} />🛒 查看菜單並點餐 (可下單)
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    scrollRestaurant.name + ' ' + scrollRestaurant.location
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-bold text-xs tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-neutral-700"
                >
                  <MapPin size={14} className="text-red-400 fill-red-400/20" />
                  直接前往 Google 地圖
                </a>

                <button
                  onClick={() => onSelectRestaurant(scrollRestaurant)}
                  className="w-full py-3 bg-transparent text-neutral-300 hover:text-white rounded-2xl font-black text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  用餐後評分反饋拿積分
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Rerun option */}
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between px-2 text-xs text-neutral-500">
                <span>還是不滿意？</span>
                <button
                  onClick={onRerun}
                  className="text-[#FF8A00] font-black hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  再決定一次
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
