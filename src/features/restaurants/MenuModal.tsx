import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Plus, Minus, CheckCircle2, RefreshCw, X, Utensils, ShoppingBag, Zap } from 'lucide-react';
import { Restaurant } from '../../types/index';
import { restaurantRepository } from '../../repositories/restaurantRepository';
import { FEATURE_FLAGS } from '../../config/featureFlags';

interface MenuModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted?: (name: string) => void;
  readOnly?: boolean;
}

export const MenuModal = ({
  restaurant,
  isOpen,
  onClose,
  onOrderCompleted,
  readOnly = false
}: MenuModalProps) => {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [isOrdering, setIsOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [orderType, setOrderType] = useState<'takeout' | 'dinein'>('dinein');
  
  const dummyMenuItems = restaurantRepository.getMenuItems();

  const isReadOnlyMode = readOnly || !FEATURE_FLAGS.ordering;

  useEffect(() => {
    if (isOpen) {
      setCart({});
      setOrdered(false);
      setIsOrdering(false);
    }
  }, [isOpen, restaurant?.name]);

  const total = useMemo(() => {
    return dummyMenuItems.reduce(
      (sum, item) => sum + item.price * (cart[item.id] || 0),
      0
    );
  }, [cart, dummyMenuItems]);

  const updateCart = (id: number, delta: number) => {
    if (!FEATURE_FLAGS.cart) return;
    setCart(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  // MVP_DEMO_ONLY: Simulate order completion. In the future, this should call a trusted backend API for order placement and point tracking
  const handleOrder = () => {
    if (!FEATURE_FLAGS.ordering || !FEATURE_FLAGS.checkout) return;
    setIsOrdering(true);
    setTimeout(() => {
      setIsOrdering(false);
      setOrdered(true);
      if (onOrderCompleted && restaurant) {
        onOrderCompleted(restaurant.name);
      }
    }, 1500);
  };

  if (!FEATURE_FLAGS.menuPreview && !FEATURE_FLAGS.ordering) return null;
  if (!restaurant) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="menu-modal-container">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="relative h-40 flex-shrink-0">
              <img src={restaurant.image} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <h2 className="text-white text-2xl font-bold">{restaurant.name}</h2>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {ordered && FEATURE_FLAGS.ordering ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">訂餐成功！</h3>
                  <p className="text-neutral-500">
                    已將您的【{orderType === 'dinein' ? '預約內用' : '外帶自取'}】訂購單送往廚房
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-8 bg-black text-white px-8 py-3 rounded-2xl font-bold"
                  >
                    太好了，走吧
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                      <Utensils size={14} /> {isReadOnlyMode ? '精選餐點瀏覽（唯讀）' : '精選餐點'}
                    </p>
                    {dummyMenuItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-3xl bg-neutral-50 border border-neutral-100"
                      >
                        <div className="flex-1">
                          <h4 className="font-bold">{item.name}</h4>
                          <p className="text-xs text-neutral-500 mt-1">{item.description}</p>
                          <p className="text-brand-primary font-bold mt-2">${item.price}</p>
                        </div>
                        {!isReadOnlyMode && FEATURE_FLAGS.cart && (
                          <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border border-neutral-100">
                            <button
                              onClick={() => updateCart(item.id, -1)}
                              className="p-1.5 hover:bg-neutral-50 rounded-xl transition-colors"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-4 text-center font-bold text-sm">
                              {cart[item.id] || 0}
                            </span>
                            <button
                              onClick={() => updateCart(item.id, 1)}
                              className="p-1.5 hover:bg-neutral-50 rounded-xl transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                    <h4 className="text-orange-800 font-bold mb-2 flex items-center gap-2">
                      <Zap size={16} /> 店長推薦語
                    </h4>
                    <p className="text-orange-700/80 text-sm leading-relaxed">
                      「這間店的水餃皮薄餡多，一定要配上特製的辣油，口感層次豐富。學生族群最愛的飽足之選！」
                    </p>
                  </div>
                </>
              )}
            </div>

            {!ordered && !isReadOnlyMode && FEATURE_FLAGS.ordering && (
              <div className="p-6 bg-white border-t border-neutral-50 space-y-4">
                {/* Takeout / Dinein Switch Slider */}
                <div className="flex items-center justify-between gap-4 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-1">
                    預選用餐方式
                  </span>
                  <div
                    className="w-48 h-9 bg-neutral-200/60 p-1 rounded-xl flex relative cursor-pointer select-none"
                    onClick={() => setOrderType(p => (p === 'dinein' ? 'takeout' : 'dinein'))}
                  >
                    <motion.div
                      className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm w-[calc(50%-4px)]"
                      animate={{ x: orderType === 'takeout' ? '100%' : '0%' }}
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                    />
                    <div
                      className={`flex-1 text-center text-xs font-extrabold z-10 transition-all flex items-center justify-center gap-1.5 h-full ${
                        orderType === 'dinein' ? 'text-black' : 'text-neutral-400'
                      }`}
                    >
                      <Utensils size={13} />
                      預約內用
                    </div>
                    <div
                      className={`flex-1 text-center text-xs font-extrabold z-10 transition-all flex items-center justify-center gap-1.5 h-full ${
                        orderType === 'takeout' ? 'text-black' : 'text-neutral-400'
                      }`}
                    >
                      <ShoppingBag size={13} />
                      外帶自取
                    </div>
                  </div>
                </div>

                <button
                  disabled={total === 0 || isOrdering}
                  onClick={handleOrder}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                    total > 0
                      ? 'bg-brand-primary text-white shadow-xl hover:bg-brand-primary/90'
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {isOrdering ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={20} />
                      結帳送單 · ${total}
                    </>
                  )}
                </button>
                <p className="text-[10.5px] text-neutral-400 text-center font-bold mt-1 leading-normal">
                  ℹ️ 此為功能測試流程，不會產生真實訂單或付款。
                </p>
              </div>
            )}

            {(isReadOnlyMode || !FEATURE_FLAGS.ordering) && (
              <div className="p-6 bg-white border-t border-neutral-50">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
                >
                  關閉菜單瀏覽
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
