import React from 'react';
import { motion } from 'motion/react';
import { Zap, CheckCircle2, Sparkles, Clock, MapPin } from 'lucide-react';
import { Restaurant } from '../../types/index';
import { calculateDistanceInMeters, getFriendlyDistanceText, getBuddyQuote } from '../../utils/index';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { getPriceRangeText } from '../../utils/budget';

interface RestaurantCardProps {
  restaurant?: Restaurant | null;
  type: 'fast' | 'safe' | 'new';
  onSelect: (r: Restaurant) => void;
  onOpenMenu: (r: Restaurant) => void;
  onGoogleMapsClick?: () => void;
  userCoords: { lat: number; lng: number } | null;
}

export const RestaurantCard = ({
  restaurant,
  type,
  onSelect,
  onOpenMenu,
  onGoogleMapsClick,
  userCoords
}: RestaurantCardProps) => {
  if (!restaurant) return null;

  const typeLabel = {
    fast: {
      label: '⚡ 趕時間？這間出餐最穩！',
      color: 'from-[#FF5C00] to-[#FF8A00] text-white shadow-orange-500/20',
      icon: Zap
    },
    safe: {
      label: '😋 穩中之穩！閉著眼睛選都對味',
      color: 'from-[#059669] to-[#10B981] text-white shadow-green-500/20',
      icon: CheckCircle2
    },
    new: {
      label: '🔮 帶你玩點不一樣的換換胃口',
      color: 'from-[#7C3AED] to-[#8B5CF6] text-white shadow-purple-500/20',
      icon: Sparkles
    }
  }[type];

  const dist = calculateDistanceInMeters(restaurant.coordinates, userCoords);
  const friendlyPrice = getPriceRangeText(restaurant.price);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="group relative bg-[#FFFBF7] rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-orange-100/60"
      id={`restaurant-card-${restaurant.name.replace(/\s+/g, '-')}`}
    >
      {/* Visual Badge Header */}
      <div
        className={`py-2 px-5 bg-gradient-to-r ${typeLabel.color} font-display text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-sm`}
      >
        <typeLabel.icon size={12} className="animate-bounce" />
        <span>{typeLabel.label}</span>
      </div>

      <div className="relative h-56 overflow-hidden">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Quick Food Features Overlay Overlay */}
        <div className="absolute top-4 right-4 flex flex-wrap gap-1.5 justify-end max-w-[200px]">
          {restaurant.tags.map((tag, idx) => (
            <span
              key={idx}
              className="bg-white/95 text-brand-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-inner"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="absolute bottom-4 left-5 right-5 text-white">
          <div className="flex items-center justify-between gap-2 mb-1 w-full">
            <div className="flex items-center gap-1.5">
              <span className="text-xs bg-[#FF5C00] text-white font-extrabold px-2 py-0.5 rounded-md">
                {restaurant.genre}
              </span>
              <span className="text-xs text-orange-200">📍 {restaurant.location}</span>
            </div>
            <span className="text-xs text-amber-300 font-extrabold flex items-center gap-0.5 bg-black/45 px-2.5 py-0.5 rounded-full select-none">
              ★ {restaurant.ratingStable ? restaurant.ratingStable.toFixed(1) : '4.3'} (Google 評分)
            </span>
          </div>
          <h3 className="text-2xl font-bold leading-none tracking-tight">
            {restaurant.name}
          </h3>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Human recommender note */}
        <div className="p-3.5 bg-orange-50/50 rounded-2xl border border-orange-100/40 relative">
          <div className="absolute -top-2.5 left-4 bg-[#FFEDE2] text-[#E05300] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
            老饕悄悄話
          </div>
          <p className="text-neutral-700 text-xs sm:text-xs leading-relaxed font-semibold">
            「 {getBuddyQuote(restaurant.name, type)} 」
          </p>
        </div>

        {/* Real life metrics */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-neutral-100/70 text-center">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-neutral-400">出餐大約</p>
            <p className="text-xs font-bold text-neutral-700 flex items-center justify-center gap-1">
              <Clock size={11} className="text-brand-primary animate-pulse" />
              {restaurant.estimatedDiningTime} 分鐘
            </p>
          </div>
          <div className="space-y-0.5 border-x border-neutral-100">
            <p className="text-[10px] uppercase font-bold text-neutral-400">距離約</p>
            <p className="text-xs font-bold text-[#E05300] flex items-center justify-center gap-1.5 leading-none">
              {getFriendlyDistanceText(dist)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-neutral-400">消費預算</p>
            <p className="text-xs font-bold text-brand-primary">💰 {friendlyPrice}</p>
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={() => onSelect(restaurant)}
            className={`${
              FEATURE_FLAGS.menuPreview ? 'flex-[1.4]' : 'flex-1'
            } bg-neutral-900 text-white hover:bg-black py-4 rounded-2xl font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5`}
          >
            <CheckCircle2 size={16} className="text-[#FF8A00]" />
            今天吃這間
          </button>
          {FEATURE_FLAGS.menuPreview && (
            <button
              onClick={() => onOpenMenu(restaurant)}
              className="flex-1 bg-orange-50 hover:bg-orange-100 text-brand-primary py-4 rounded-2xl font-bold text-sm transition-colors active:scale-95 cursor-pointer"
            >
              看菜單瀏覽
            </button>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              restaurant.name + ' ' + restaurant.location
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            title="在 Google 地圖中搜尋"
            onClick={() => onGoogleMapsClick?.()}
            className="p-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-all rounded-2xl flex items-center justify-center cursor-pointer active:scale-95"
          >
            <MapPin size={18} className="text-red-500 fill-red-200" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
