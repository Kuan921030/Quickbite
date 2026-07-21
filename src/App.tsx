import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  ChevronRight,
  Zap,
  Flame,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  User,
  Clock,
  ShoppingCart,
  ArrowLeft,
} from 'lucide-react';

// Types & Repositories & Services
import { Restaurant, UserSession } from './types/index';
import { restaurantRepository } from './repositories/restaurantRepository';
import { authRepository } from './repositories/index';
import { userService } from './services/userService';
import { recommendationService } from './services/recommendationService';
import { recommendationEventService } from './services/recommendationEventService';

// Utilities
import { calculateDistanceInMeters, getFriendlyDistanceText } from './utils/index';
import { getPriceRangeText } from './utils/budget';

// Shared Components
import { BudgetSelector } from './components/BudgetSelector';
import { DistanceSelector } from './components/DistanceSelector';
import { CuisineSelector } from './components/CuisineSelector';
import { HurrySelector } from './components/HurrySelector';

// Feature Components
import { RestaurantCard } from './features/recommendations/RestaurantCard';
import { MenuModal } from './features/restaurants/MenuModal';
import { MemberCenter } from './features/auth/MemberCenter';
import { HelpMeDecideAnimator } from './components/animators/HelpMeDecideAnimator';
import { HelpMePickOneAnimator } from './components/animators/HelpMePickOneAnimator';
import { FEATURE_FLAGS } from './config/featureFlags';

let appRenderCount = 0;

function isSessionEqual(s1: any, s2: any): boolean {
  if (s1 === s2) return true;
  if (!s1 || !s2) return false;
  
  if (s1.username !== s2.username) return false;
  if (s1.points !== s2.points) return false;
  if (s1.tier !== s2.tier) return false;
  if (s1.nickname !== s2.nickname) return false;
  if (s1.mealsOrdered !== s2.mealsOrdered) return false;
  if (s1.photoURL !== s2.photoURL) return false;
  
  // Compare visitedCount
  const keys1 = Object.keys(s1.visitedCount || {});
  const keys2 = Object.keys(s2.visitedCount || {});
  if (keys1.length !== keys2.length) return false;
  for (const k of keys1) {
    if (s1.visitedCount[k] !== s2.visitedCount[k]) return false;
  }
  
  // Compare coupons
  const c1 = s1.coupons || [];
  const c2 = s2.coupons || [];
  if (c1.length !== c2.length) return false;
  for (let i = 0; i < c1.length; i++) {
    if (c1[i].id !== c2[i].id) return false;
    if (c1[i].status !== c2[i].status) return false;
    if (c1[i].isUsed !== c2[i].isUsed) return false;
  }
  
  return true;
}

function WelcomeHeaderClock() {
  const [time, setTime] = useState<string>('12:00:00');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-xs font-bold text-neutral-800 bg-[#FFF3EB] px-2.5 py-1 rounded-full border border-orange-150">
      ⏰ {time}
    </div>
  );
}

function MinutesLeftPrompt() {
  const [minutesLeftText, setMinutesLeftText] = useState<string>('');

  useEffect(() => {
    const calculateText = () => {
      const now = new Date();
      const hr = now.getHours();
      let text = '';
      if (hr < 11) {
        text = `離 12:00 午餐黃金開飯時間還有 ${60 - now.getMinutes()} 分鐘 🍽️`;
      } else if (hr === 11) {
        text = `距離 12:00 最強飯點還有 ${60 - now.getMinutes()} 分鐘，快物色好去處！🎯`;
      } else if (hr === 12) {
        text = `⚠️ 尖峰高熱：午餐黃金開飯已經過 ${now.getMinutes()} 分鐘！公館排隊潮火力全開 🔥`;
      } else if (hr === 13) {
        text = `⚠️ 已經 1 點了！距離下午工作/開工剩下約 ${
          60 - now.getMinutes()
        } 分鐘，不能再猶豫了！`;
      } else {
        text = `下午工作衝刺中，吃頓好料才能維持元氣！☕`;
      }
      setMinutesLeftText(text);
    };

    calculateText();
    const interval = setInterval(calculateText, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex gap-1.5 px-4 py-2 rounded-2xl bg-orange-100/50 text-[#C2410C] text-[11px] font-bold shadow-inner">
      {minutesLeftText}
    </div>
  );
}

function RecommendationsTimeHeader() {
  const [time, setTime] = useState<string>('12:00:00');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2 bg-[#FFF3EB] p-4 rounded-3xl border border-orange-100/80 shadow-sm animate-pulse">
      <p className="text-[10px] uppercase font-black text-brand-primary tracking-wider leading-none">
        ⚡ 公館商圈校正情報
      </p>
      <div className="text-xs text-[#9A3412] font-semibold leading-relaxed">
        ⏰ 飯點尖峰在 {time} 已火力拉滿！這 3 間是我們依據你的偏好，精確算出的【極速避開長排隊名單】
      </div>
    </div>
  );
}

export default function App() {
  if (import.meta.env.DEV) {
    appRenderCount++;
    if (appRenderCount <= 50) {
      console.log(`[Dev Audit] App render count: ${appRenderCount}`);
    } else if (appRenderCount === 51) {
      console.warn(`[Dev Audit] App rendered at extremely high frequency! Stopped logging.`);
    }
  }

  const [budget, setBudget] = useState(1); // Default to '300 內' (index 1)
  const [distance, setDistance] = useState(1); // Default to '500m' (index 1)
  const [cuisine, setCuisine] = useState('全部'); // Default to '全部' (no cuisine filter)
  const [group, setGroup] = useState('一人食');
  const [hurry, setHurry] = useState(false);
  const [step, setStep] = useState<'welcome' | 'preferences' | 'recommendations' | 'rating'>('welcome');
  const [selectedForMenu, setSelectedForMenu] = useState<Restaurant | null>(null);
  const [menuReadOnly, setMenuReadOnly] = useState(false);

  const openMenu = (restaurant: Restaurant | null, readOnly: boolean = false) => {
    if (restaurant === null) {
      setSelectedForMenu(null);
      return;
    }
    if (readOnly && !FEATURE_FLAGS.menuPreview) return;
    if (!readOnly && !FEATURE_FLAGS.ordering) return;
    
    setSelectedForMenu(restaurant);
    setMenuReadOnly(readOnly);
  };
  const [lastPicked, setLastPicked] = useState<Restaurant | null>(null);
  const [showRatingFeedback, setShowRatingFeedback] = useState(false);
  const [selectedWaitTime, setSelectedWaitTime] = useState<'10' | '20' | '30'>('20');
  const [refreshKey, setRefreshKey] = useState(0);

  const [submittedPreferences, setSubmittedPreferences] = useState({
    budget: 1,
    distance: 1,
    cuisine: '全部',
    group: '一人食',
    hurry: false,
    activeSessionId: null as string | null
  });

  const isPopStateRef = useRef(false);

  // Initialize browser history on first load
  useEffect(() => {
    if (!window.history.state || window.history.state.step !== 'welcome') {
      window.history.replaceState({ step: 'welcome' }, '');
    }
  }, []);

  // Listen to popstate event (browser back/forward)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.step) {
        isPopStateRef.current = true;
        setStep(event.state.step);
      } else {
        isPopStateRef.current = true;
        setStep('welcome');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync state step changes to browser history
  useEffect(() => {
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }
    if (window.history.state && window.history.state.step === step) {
      return;
    }
    window.history.pushState({ step }, '');
  }, [step]);

  const handleBackToPreferences = () => {
    if (window.history.state && window.history.state.step === 'recommendations') {
      window.history.back();
    } else {
      setStep('preferences');
    }
  };

  // Modern decision flow & animator states
  const [isHelpMeDecideOpen, setIsHelpMeDecideOpen] = useState(false);
  const [helpMeDecideTarget, setHelpMeDecideTarget] = useState<Restaurant | null>(null);
  const [isHelpMePickOneOpen, setIsHelpMePickOneOpen] = useState(false);

  // High climax picker states (roulette / slot-machine)
  const [isRolling, setIsRolling] = useState(false);
  const [rollingRestaurantName, setRollingRestaurantName] = useState('');
  const [rollingStatusText, setRollingStatusText] = useState('');

  // Membership and authentication states
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Geolocation and GPS States
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'success' | 'error'>('idle');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>('');

  // Analytics session and event logging tracking
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const loggedShownRef = useRef<Record<string, boolean>>({});
  const lastSessionKeyRef = useRef<string>('');

  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMsg('瀏覽器不支援 GPS 定位');
      return;
    }
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsStatus('success');
      },
      error => {
        setGpsStatus('error');
        let errMsg = '定位失敗，轉用台大校園中心座標';
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = '定位權限遭拒絕，已使用台大中心座標';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errMsg = 'GPS 位置不可用，已使用台大中心座標';
        } else if (error.code === error.TIMEOUT) {
          errMsg = '定位超時，已使用台大中心座標';
        }
        setGpsErrorMsg(errMsg);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    requestGpsLocation();
  }, []);

  useEffect(() => {
    const unsubscribe = authRepository.subscribeToAuthState(async (userProfile) => {
      if (userProfile) {
        const saved = await userService.getUserSession();
        setCurrentUser(prev => isSessionEqual(prev, saved) ? prev : saved);
      } else {
        setCurrentUser(prev => prev === null ? prev : null);
      }
    });
    return () => unsubscribe();
  }, []);

  const getRecommendations = useMemo(() => {
    return recommendationService.getRecommendations({
      budget: submittedPreferences.budget,
      distance: submittedPreferences.distance,
      cuisine: submittedPreferences.cuisine,
      group: submittedPreferences.group,
      hurry: submittedPreferences.hurry,
      refreshKey,
      userCoords,
      activeSessionId: submittedPreferences.activeSessionId,
    });
  }, [submittedPreferences, refreshKey, userCoords]);

  // Handle start of recommendation flow from preferences page
  const startRecommendationFlow = () => {
    const newSessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setActiveSessionId(newSessionId);
    setRefreshKey(0);
    setSubmittedPreferences({
      budget,
      distance,
      cuisine,
      group,
      hurry,
      activeSessionId: newSessionId
    });
    setStep('recommendations');
  };

  // Reset session and refresh key when going back to the home page
  useEffect(() => {
    if (step === 'welcome') {
      setActiveSessionId(null);
      setRefreshKey(0);
    }
  }, [step]);

  // Analytics Session and Event Logging Effects
  useEffect(() => {
    if (step !== 'recommendations' || !currentUser || !submittedPreferences.activeSessionId) {
      return;
    }

    const currentSessionKey = `${submittedPreferences.budget}_${submittedPreferences.distance}_${submittedPreferences.cuisine}_${submittedPreferences.group}_${submittedPreferences.hurry}_${submittedPreferences.activeSessionId}_${currentUser.username}`;

    if (lastSessionKeyRef.current !== currentSessionKey) {
      lastSessionKeyRef.current = currentSessionKey;
      loggedShownRef.current = {};

      const recommendedRestaurantIds = [
        getRecommendations.fast?.restaurantId,
        getRecommendations.safe?.restaurantId,
        getRecommendations.new?.restaurantId
      ].filter((id): id is string => typeof id === 'string');

      recommendationEventService.startSession({
        id: submittedPreferences.activeSessionId,
        userId: currentUser.username,
        budget: submittedPreferences.budget,
        distance: submittedPreferences.distance,
        cuisine: submittedPreferences.cuisine,
        group: submittedPreferences.group,
        hurry: submittedPreferences.hurry,
        recommendedRestaurantIds
      });

      const restaurants = [getRecommendations.fast, getRecommendations.safe, getRecommendations.new];
      restaurants.forEach(r => {
        if (r && !loggedShownRef.current[`shown_${submittedPreferences.activeSessionId}_${r.restaurantId}`]) {
          loggedShownRef.current[`shown_${submittedPreferences.activeSessionId}_${r.restaurantId}`] = true;
          recommendationEventService.logEvent({
            sessionId: submittedPreferences.activeSessionId!,
            userId: currentUser.username,
            restaurantId: r.restaurantId,
            eventType: 'recommendation_shown'
          });
        }
      });
    } else {
      const restaurants = [getRecommendations.fast, getRecommendations.safe, getRecommendations.new];
      restaurants.forEach(r => {
        if (r && !loggedShownRef.current[`shown_${submittedPreferences.activeSessionId}_${r.restaurantId}`]) {
          loggedShownRef.current[`shown_${submittedPreferences.activeSessionId}_${r.restaurantId}`] = true;
          recommendationEventService.logEvent({
            sessionId: submittedPreferences.activeSessionId!,
            userId: currentUser.username,
            restaurantId: r.restaurantId,
            eventType: 'recommendation_shown'
          });
        }
      });
    }
  }, [step, currentUser, submittedPreferences, getRecommendations]);

  useEffect(() => {
    if (step === 'rating' && lastPicked && currentUser && activeSessionId) {
      const key = `opened_${activeSessionId}_${lastPicked.restaurantId}`;
      if (!loggedShownRef.current[key]) {
        loggedShownRef.current[key] = true;
        recommendationEventService.logEvent({
          sessionId: activeSessionId,
          userId: currentUser.username,
          restaurantId: lastPicked.restaurantId,
          eventType: 'restaurant_opened'
        });
      }
    }
  }, [step, lastPicked, currentUser, activeSessionId]);

  useEffect(() => {
    if (selectedForMenu && currentUser && activeSessionId) {
      const key = `menu_${activeSessionId}_${selectedForMenu.restaurantId}`;
      if (!loggedShownRef.current[key]) {
        loggedShownRef.current[key] = true;
        recommendationEventService.logEvent({
          sessionId: activeSessionId,
          userId: currentUser.username,
          restaurantId: selectedForMenu.restaurantId,
          eventType: 'menu_opened'
        });
      }
    }
  }, [selectedForMenu, currentUser, activeSessionId]);

  const handleOrderCompleted = async (restaurantName: string) => {
    if (!currentUser) return;
    const updated = await userService.recordOrder(currentUser, restaurantName);
    setCurrentUser(updated);

    const matchedRestaurant = restaurantRepository.getAllRestaurants().find(r => r.name === restaurantName);
    const restaurantId = matchedRestaurant?.restaurantId || lastPicked?.restaurantId || '';
    if (activeSessionId && restaurantId) {
      recommendationEventService.logEvent({
        sessionId: activeSessionId,
        userId: currentUser.username,
        restaurantId,
        eventType: 'mock_order_completed'
      });
    }
  };

  const handleTriggerHelpMeDecide = () => {
    const newSessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setActiveSessionId(newSessionId);
    setRefreshKey(0);
    setSubmittedPreferences({
      budget,
      distance,
      cuisine,
      group,
      hurry,
      activeSessionId: newSessionId
    });

    const recs = recommendationService.getRecommendations({
      budget,
      distance,
      cuisine,
      group,
      hurry,
      refreshKey: 0,
      userCoords,
      activeSessionId: newSessionId,
    });

    const options = [recs.fast, recs.safe, recs.new].filter((r): r is Restaurant => r !== null && r !== undefined);
    const picked = options[Math.floor(Math.random() * options.length)] || restaurantRepository.getAllRestaurants()[0];

    if (currentUser) {
      const recommendedRestaurantIds = options.map(o => o.restaurantId);
      recommendationEventService.startSession({
        id: newSessionId,
        userId: currentUser.username,
        budget,
        distance,
        cuisine,
        group,
        hurry,
        recommendedRestaurantIds
      });
    }

    setHelpMeDecideTarget(picked);
    setIsHelpMeDecideOpen(true);
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-white relative pb-20 overflow-x-hidden">
      {step !== 'welcome' && (
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-neutral-100 flex-shrink-0">
          {/* Top-Left: Personal Center Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-1.5 bg-neutral-50 hover:bg-orange-55 p-2 px-3 rounded-2xl border border-neutral-200/50 hover:border-brand-primary/20 transition-all cursor-pointer shadow-sm active:scale-95 text-neutral-700 font-bold"
          >
            <div className="w-5 h-5 rounded-full bg-brand-primary text-white text-[10px] flex items-center justify-center font-bold font-sans">
              {currentUser ? currentUser.nickname[0] : <User size={12} />}
            </div>
            <span className="text-xs">
              {currentUser
                ? currentUser.nickname.split(' ')[1] || currentUser.nickname.slice(0, 5)
                : '會員中心'}
            </span>
            {currentUser && <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-0.5"></span>}
          </button>

          {/* Centered Logo & Trademark */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 cursor-pointer select-none font-bold"
            onClick={() => setStep('welcome')}
          >
            <Flame size={20} className="text-brand-primary animate-pulse" fill="currentColor" />
            <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-neutral-900 to-neutral-700 bg-clip-text text-transparent leading-none">
              QuickBite
            </span>
            <span className="text-[10px] font-extrabold text-neutral-400 align-super -mt-1">
              🅪
            </span>
          </div>

          {/* Top-Right Info of Preferences / Refresh */}
          <div className="flex items-center">
            {step === 'recommendations' ? (
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-black py-2 px-3 bg-neutral-100/80 hover:bg-neutral-200/85 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw size={12} />
                為你重新挑選
              </button>
            ) : (
              <button
                onClick={() => setStep('welcome')}
                className="text-xs font-bold text-neutral-400 hover:text-black cursor-pointer"
              >
                回首頁
              </button>
            )}
          </div>
        </header>
      )}

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex flex-col justify-between p-6 text-center bg-gradient-to-b from-[#FFFDFB] via-[#FFF8F1] to-[#FFEFE0] text-neutral-800"
          >
            {/* Top Crisis Tracker */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-3 px-4 rounded-3xl border border-orange-100/60 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-bold">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>公館飯點熱度：</span>
                  <span className="text-red-500">🔥🔥 爆滿警報</span>
                </div>
                <WelcomeHeaderClock />
              </div>

              {/* Stress prompt */}
              <MinutesLeftPrompt />
            </div>

            {/* Core Foodie Hero */}
            <div className="my-auto py-8 space-y-8 flex flex-col items-center">
              {/* Rotating appetizing plate */}
              <div className="relative">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                  className="w-32 h-32 rounded-full border-4 border-dashed border-[#FF8A00]/20 p-2 flex items-center justify-center bg-white shadow-xl"
                >
                  <img
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200"
                    className="w-full h-full rounded-full object-cover"
                    alt="Delicious food rotating"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
                {/* Steaming hot heat rays */}
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 justify-center">
                  {[1, 2, 3].map(i => (
                    <motion.span
                      key={i}
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: -15, opacity: [0, 0.8, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                      className="text-xs text-orange-400 font-bold select-none leading-none"
                    >
                      ♨️
                    </motion.span>
                  ))}
                </span>
                <span className="absolute -bottom-1 -right-1 bg-brand-primary text-white p-2 rounded-full shadow-lg">
                  <Flame size={16} fill="currentColor" />
                </span>
              </div>

              <div className="space-y-4 max-w-sm">
                <h1 className="text-4xl sm:text-4xl font-black tracking-tight leading-snug font-display text-neutral-900">
                  今天中午又不知道
                  <br />
                  <span className="text-brand-primary underline decoration-dashed decoration-brand-secondary/40">
                    吃什麼了嗎？
                  </span>
                </h1>
                <p className="text-neutral-500 font-medium text-sm px-6 leading-relaxed">
                  別再滑 Google Maps 十分鐘了。從台大周邊餐廳，為你挑出最適合的三間，不求多、只求快，30秒內直接出發！
                </p>
              </div>
            </div>

            {/* Bottom Button CTA & Tracker */}
            <div className="pb-6 space-y-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep('preferences')}
                className="w-full py-5 bg-gradient-to-r from-brand-primary to-[#FF8A00] text-white rounded-[2rem] font-bold text-xl shadow-xl shadow-brand-primary/30 flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden"
              >
                <span className="absolute right-6 opacity-35 text-2xl">👉</span>
                🔥 30 秒解決今天的午餐！
              </motion.button>

              <p className="text-neutral-400 text-xs font-semibold">
                「 只花 30 秒下決定，把剩下的 50 分鐘留給午休 ☕ 」
              </p>
            </div>
          </motion.div>
        )}

        {step === 'preferences' && (
          <motion.div
            key="pref"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="p-6 space-y-10 bg-gradient-to-b from-[#FFFDFB] to-[#FFF9F3] min-h-screen"
          >
            <div className="pt-8 flex justify-between items-center gap-4">
              <div>
                <span className="text-xs bg-[#FFF3EB] text-[#FF5C00] font-extrabold px-3 py-1 rounded-full border border-orange-100 shadow-sm inline-block mb-2">
                  Step 1. 客製你的今日防線
                </span>
                <h2 className="text-2xl min-[365px]:text-3xl font-black text-neutral-900 tracking-tight leading-snug">
                  今天中午，
                  <br />
                  <span className="text-neutral-400">想吃什麼感覺的？</span>
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleTriggerHelpMeDecide}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 px-4 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-2xl shadow-xl shadow-neutral-950/20 cursor-pointer select-none border-2 border-[#FF8A00] shrink-0 relative overflow-hidden group"
                id="pref-decide-for-me-btn"
              >
                {/* Subtle shine effect */}
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-25deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out" />
                <span className="text-2xl animate-pulse">🎲</span>
                <span className="text-[11px] font-black tracking-wider whitespace-nowrap text-[#FF8A00]">幫我決定</span>
              </motion.button>
            </div>

            <div className="space-y-8">
              {/* Group */}
              <section className="space-y-3.5">
                <label className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <span>👥 今天跟誰吃飯？</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['一人食', '約會', '朋友聚餐'].map(t => (
                    <button
                      key={t}
                      onClick={() => setGroup(t)}
                      className={`py-3.5 rounded-2xl font-bold transition-all border-2 text-sm cursor-pointer select-none ${
                        group === t
                          ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-sm font-black'
                          : 'bg-white border-neutral-100 hover:border-orange-100 text-neutral-400 font-medium'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>

              {/* Budget */}
              <section className="space-y-3.5">
                <label className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <span>💰 今天的荷包防禦力？</span>
                </label>
                <BudgetSelector value={budget} onChange={setBudget} />
              </section>

              {/* Distance */}
              <section className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                    <span>🚶 願意走多遠去朝聖？</span>
                  </label>
                  <button
                    onClick={requestGpsLocation}
                    type="button"
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 duration-150"
                  >
                    {gpsStatus === 'detecting' && (
                      <span className="text-orange-500 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] inline-block" />
                        定位追蹤中...
                      </span>
                    )}
                    {gpsStatus === 'success' && (
                      <span className="text-green-600 flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded-md text-[9px] font-black border border-green-100">
                        🟢 經緯度已定位
                      </span>
                    )}
                    {(gpsStatus === 'error' || gpsStatus === 'idle') && (
                      <span
                        className="text-neutral-500 hover:text-brand-primary flex items-center gap-1 bg-neutral-100 py-0.5 px-1.5 rounded"
                        title={gpsErrorMsg || '點擊手動重新抓取 GPS 位置'}
                      >
                        📍 {gpsStatus === 'error' ? '預設預估點 (點擊重試)' : '手動重設 GPS'}
                      </span>
                    )}
                  </button>
                </div>
                <DistanceSelector value={distance} onChange={setDistance} />
              </section>

              {/* Cuisine */}
              <section className="space-y-3.5">
                <label className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <span>🌶️ 舌尖渴望什麼口感？</span>
                  {cuisine !== '全部' && (
                    <span className="bg-brand-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {cuisine}
                    </span>
                  )}
                </label>
                <CuisineSelector
                  value={cuisine}
                  onChange={val => setCuisine(prev => (prev === val ? '全部' : val))}
                />
              </section>

              {/* Hurry Selector */}
              <section className="space-y-4">
                <HurrySelector value={hurry} onChange={setHurry} />
              </section>
            </div>

            <div className="pt-4 pb-8">
              <button
                onClick={startRecommendationFlow}
                className="w-full py-5 bg-neutral-900 text-white hover:bg-black rounded-3xl font-extrabold text-lg flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl active:scale-95 transition-all cursor-pointer"
              >
                <span>✨ 好了，幫我縮小猶豫圈！</span>
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'recommendations' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen bg-[#FFFDFB] pb-32"
          >
            <div className="h-4" />

            <div className="px-6 space-y-6">
              <RecommendationsTimeHeader />

              {(() => {
                const visibleCount = [getRecommendations.fast, getRecommendations.safe, getRecommendations.new].filter(Boolean).length;
                return (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
                        ✨ {visibleCount > 0 ? `嘿！我幫你縮到這 ${visibleCount} 間了` : '😢 找不到符合條件的餐廳'}
                      </h2>
                      <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
                        {visibleCount > 0 
                          ? '別再滑 Google Maps 排行榜了，這幾間閉著眼睛選一間都對味：' 
                          : '沒有任何符合你今日預算的店家符合其他篩選條件。'}
                      </p>
                    </div>

                    {visibleCount > 0 && visibleCount < 3 && (
                      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center text-xs text-orange-800 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                        <span>💡 符合條件的選擇較少，已優先保留你的預算限制</span>
                      </div>
                    )}

                    <div className="grid gap-6">
                      {visibleCount === 0 && (
                        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-orange-100 shadow-sm flex flex-col items-center justify-center space-y-3">
                          <p className="text-neutral-500 font-bold text-base">😢 找不到符合預算與條件的餐廳</p>
                          <p className="text-neutral-400 text-xs">建議點擊下方返回按鈕，放寬「距離」或「料理別」再試一次！</p>
                        </div>
                      )}
                      <RestaurantCard
                        type="fast"
                        restaurant={getRecommendations.fast}
                        onSelect={r => {
                          setLastPicked(r);
                          setShowRatingFeedback(false);
                          setStep('rating');
                        }}
                        onOpenMenu={r => {
                          openMenu(r, true);
                        }}
                        onGoogleMapsClick={() => {
                          if (currentUser && activeSessionId && getRecommendations.fast) {
                            recommendationEventService.logEvent({
                              sessionId: activeSessionId,
                              userId: currentUser.username,
                              restaurantId: getRecommendations.fast.restaurantId,
                              eventType: 'google_maps_clicked'
                            });
                          }
                        }}
                        userCoords={userCoords}
                      />
                      <RestaurantCard
                        type="safe"
                        restaurant={getRecommendations.safe}
                        onSelect={r => {
                          setLastPicked(r);
                          setShowRatingFeedback(false);
                          setStep('rating');
                        }}
                        onOpenMenu={r => {
                          openMenu(r, true);
                        }}
                        onGoogleMapsClick={() => {
                          if (currentUser && activeSessionId && getRecommendations.safe) {
                            recommendationEventService.logEvent({
                              sessionId: activeSessionId,
                              userId: currentUser.username,
                              restaurantId: getRecommendations.safe.restaurantId,
                              eventType: 'google_maps_clicked'
                            });
                          }
                        }}
                        userCoords={userCoords}
                      />
                      <RestaurantCard
                        type="new"
                        restaurant={getRecommendations.new}
                        onSelect={r => {
                          setLastPicked(r);
                          setShowRatingFeedback(false);
                          setStep('rating');
                        }}
                        onOpenMenu={r => {
                          openMenu(r, true);
                        }}
                        onGoogleMapsClick={() => {
                          if (currentUser && activeSessionId && getRecommendations.new) {
                            recommendationEventService.logEvent({
                              sessionId: activeSessionId,
                              userId: currentUser.username,
                              restaurantId: getRecommendations.new.restaurantId,
                              eventType: 'google_maps_clicked'
                            });
                          }
                        }}
                        userCoords={userCoords}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Sticky bottom floating climax bar with the back button and blind selection button */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-40 bg-white/95 backdrop-blur-md p-2 px-3 rounded-[2.5rem] shadow-2xl border border-orange-100 flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom duration-300" id="floating-climax-bar-container">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToPreferences}
                aria-label="返回修改條件"
                className="w-12 h-12 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-black cursor-pointer transition-all flex items-center justify-center shrink-0 shadow-sm active:scale-95"
                id="floating-back-to-pref-btn"
                title="修改條件"
              >
                <ArrowLeft size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsHelpMePickOneOpen(true)}
                className="flex-1 py-3.5 bg-gradient-to-r from-brand-primary to-[#FF8A00] text-white rounded-[2rem] font-black text-xs min-[360px]:text-sm shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-1.5 cursor-pointer animate-pulse overflow-hidden whitespace-nowrap"
                id="floating-blind-decide-btn"
              >
                <Sparkles size={14} fill="currentColor" />
                還是拿不定主意？幫我盲選一個！
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 'rating' && lastPicked && (
          <motion.div
            key="rating"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50"
          >
            <div className="w-full max-w-sm bg-white p-6 rounded-[2.5rem] shadow-2xl space-y-6 border border-neutral-100/80 animate-in fade-in zoom-in duration-300">
              {showRatingFeedback ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-5"
                >
                  <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 size={36} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-neutral-800">回饋已送出！</h3>
                    <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100 space-y-1 mx-3">
                      <p className="text-neutral-500 text-xs">
                        本次出餐等待時間：
                        <span className="text-brand-primary font-bold">
                          {selectedWaitTime === '10'
                            ? '10分鐘內'
                            : selectedWaitTime === '20'
                            ? '20分鐘內'
                            : '30分鐘內'}
                        </span>
                      </p>
                      <p className="text-neutral-400 text-[11px]">
                        體驗數據已回傳至吃貨校正核心！
                      </p>
                    </div>
                    <p className="text-neutral-500 text-xs px-4 leading-relaxed">
                      謝謝您的真實出餐速度與美味回饋！這將大幅協助 AI 系統進行推薦引擎的精準度調整，為您與全體會員提供更完美的午餐指引。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRatingFeedback(false);
                      setStep('welcome');
                    }}
                    className="w-[calc(100%-24px)] mx-auto py-3.5 bg-black text-white rounded-2xl font-bold hover:bg-neutral-800 transition-colors cursor-pointer active:scale-95 text-sm"
                  >
                    回首頁
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-brand-primary text-xs font-bold shadow-sm">
                      <Sparkles size={12} fill="currentColor" />
                      為您決定的最佳選擇
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 mt-2">{lastPicked.name}</h2>
                    <p className="text-sm text-neutral-500">
                      {lastPicked.location} · {lastPicked.genre}
                    </p>
                  </div>

                  {/* Restaurant Photo Preview */}
                  <div className="relative h-32 rounded-2xl overflow-hidden shadow-inner">
                    <img
                      src={lastPicked.image}
                      className="w-full h-full object-cover"
                      alt={lastPicked.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white text-[11px] font-medium flex items-center gap-2">
                      <span>約 {lastPicked.estimatedDiningTime} 分鐘</span>
                      <span>•</span>
                      <span>
                        {getFriendlyDistanceText(
                          calculateDistanceInMeters(lastPicked.coordinates, userCoords)
                        )}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-orange-300">
                        {getPriceRangeText(lastPicked.price)}
                      </span>
                    </div>
                  </div>

                   {/* Actions in Decision Page */}
                  <div className="space-y-2">
                    {FEATURE_FLAGS.ordering ? (
                      <>
                        <button
                          onClick={() => {
                            openMenu(lastPicked, false);
                          }}
                          className="w-full py-4 bg-[#FF5C00] text-white hover:bg-[#E05300] rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-orange-500/10"
                        >
                          <ShoppingCart size={16} />🛒 查看菜單並點餐 (可下單)
                        </button>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            lastPicked.name + ' ' + lastPicked.location
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (currentUser && activeSessionId && lastPicked) {
                              recommendationEventService.logEvent({
                                sessionId: activeSessionId,
                                userId: currentUser.username,
                                restaurantId: lastPicked.restaurantId,
                                eventType: 'google_maps_clicked'
                              });
                            }
                          }}
                          className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-red-100/50"
                        >
                          <MapPin size={16} className="fill-red-200" />
                          直接前往 Google 地圖
                        </a>
                      </>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          lastPicked.name + ' ' + lastPicked.location
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (currentUser && activeSessionId && lastPicked) {
                            recommendationEventService.logEvent({
                              sessionId: activeSessionId,
                              userId: currentUser.username,
                              restaurantId: lastPicked.restaurantId,
                              eventType: 'google_maps_clicked'
                            });
                          }
                        }}
                        className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                      >
                        <MapPin size={16} className="fill-red-200" />
                        直接前往 Google 地圖
                      </a>
                    )}
                  </div>

                  {/* Expecting Wait Time Selector */}
                  <div className="border-t border-neutral-100 pt-4 space-y-2 text-center">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center justify-center gap-1.5 pb-0.5 animate-pulse">
                      <Clock size={12} className="text-neutral-400" />
                      回報本次實際出餐（等待）時間
                    </p>
                    <div className="grid grid-cols-3 gap-2 px-1">
                      {[
                        { id: '10', label: '10分鐘內' },
                        { id: '20', label: '20分鐘內' },
                        { id: '30', label: '30分鐘內' },
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedWaitTime(item.id as any)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            selectedWaitTime === item.id
                              ? 'bg-orange-55 text-brand-primary border-brand-primary/80 shadow-sm font-extrabold'
                              : 'bg-neutral-50 text-neutral-500 border-transparent hover:bg-neutral-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 pt-4 space-y-3.5 text-center">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                      用餐後給個美味評分吧！
                    </p>
                    <div className="flex justify-center gap-3">
                      {[
                        { emoji: '😫', label: '不好吃' },
                        { emoji: '😐', label: '普通' },
                        { emoji: '😋', label: '太棒了' },
                      ].map((item, i) => (
                        <button
                          key={i}
                          className="flex flex-col items-center gap-1 p-3 bg-neutral-50 hover:bg-orange-50 hover:text-brand-primary rounded-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer border border-neutral-100/50"
                          onClick={async () => {
                            setShowRatingFeedback(true);
                            if (currentUser) {
                              // MVP_DEMO_ONLY: Awarding points client-side. In production, rating feedback submission and associated points must be processed securely by the server.
                              const updated = await userService.addPoints(currentUser, 50); // Award 50 points for rating feedback
                              setCurrentUser(updated);

                              if (activeSessionId && lastPicked) {
                                recommendationEventService.logEvent({
                                  sessionId: activeSessionId,
                                  userId: currentUser.username,
                                  restaurantId: lastPicked.restaurantId,
                                  eventType: 'rating_submitted',
                                  ratingValue: i + 1,
                                  waitTimeCategory: selectedWaitTime
                                });
                              }
                            }
                          }}
                        >
                          <span className="text-3xl">{item.emoji}</span>
                          <span className="text-[10px] text-neutral-400 mt-0.5">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={() => {
                        setShowRatingFeedback(false);
                        if (window.history.state && window.history.state.step === 'recommendations') {
                          window.history.back();
                        } else {
                          setStep('recommendations');
                        }
                      }}
                      className="text-neutral-400 text-xs font-semibold hover:text-neutral-700 transition-colors duration-200 cursor-pointer"
                    >
                      返回推薦名單
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High-vibe Slot Machine Roulette Overlay */}
      <AnimatePresence>
        {isRolling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#FFFBF7]/95 backdrop-blur-md"
          >
            <div className="w-full max-w-sm text-center space-y-8">
              {/* Pulsing steam plate indicator */}
              <div className="relative inline-block">
                <motion.div
                  animate={{
                    scale: [1, 1.12, 1],
                    rotate: 360,
                  }}
                  transition={{
                    scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
                    rotate: { duration: 2.2, ease: 'linear', repeat: Infinity },
                  }}
                  className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#FF5C00] via-[#FF8A00] to-[#FFEAD1] p-1 flex items-center justify-center shadow-2xl"
                >
                  <div className="w-full h-full bg-[#FFFBF7] rounded-full flex items-center justify-center">
                    <Flame size={40} className="text-brand-primary" fill="currentColor" />
                  </div>
                </motion.div>

                {/* Steaming indicator */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {[1, 2, 3].map(i => (
                    <motion.span
                      key={i}
                      initial={{ y: 0, opacity: 0 }}
                      animate={{ y: -20, opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                      className="text-lg"
                    >
                      ♨️
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Rolling Slot Reel */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-inner border border-orange-100/50 space-y-4">
                <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest animate-pulse">
                  🗳️ SLOT DECIDING • 正在排除猶豫中
                </p>

                {/* Display scrolling names */}
                <div className="h-16 overflow-hidden relative flex items-center justify-center border-y border-orange-100/30">
                  <motion.div
                    key={rollingRestaurantName}
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -25, opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="text-2xl font-black text-neutral-800 tracking-tight"
                  >
                    🍜 {rollingRestaurantName}
                  </motion.div>
                </div>

                <p className="text-xs font-bold text-neutral-600 h-6">{rollingStatusText}</p>
              </div>

              <div className="text-[11px] font-semibold text-neutral-400 max-w-xs mx-auto leading-relaxed">
                「
                放心，我們正在秒速篩除低分雷店、公館排隊爆滿熱區、以及不符合你今日荷包預算的店家...
                」
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {FEATURE_FLAGS.menuPreview && (
        <MenuModal
          isOpen={!!selectedForMenu}
          restaurant={selectedForMenu}
          onClose={() => openMenu(null)}
          onOrderCompleted={handleOrderCompleted}
          readOnly={menuReadOnly}
        />
      )}

      <AnimatePresence>
        {showProfileModal && (
          <MemberCenter
            onClose={() => setShowProfileModal(false)}
            currentUser={currentUser}
            onLoginStateChange={setCurrentUser}
          />
        )}
      </AnimatePresence>

      <HelpMeDecideAnimator
        isOpen={isHelpMeDecideOpen}
        onClose={() => setIsHelpMeDecideOpen(false)}
        targetRestaurant={helpMeDecideTarget}
        userCoords={userCoords}
        onSelectRestaurant={(r) => {
          setLastPicked(r);
          setShowRatingFeedback(false);
          setStep('rating');
          setIsHelpMeDecideOpen(false);
        }}
        onOpenMenu={(r) => {
          openMenu(r, false);
        }}
        onRerun={handleTriggerHelpMeDecide}
      />

      <HelpMePickOneAnimator
        isOpen={isHelpMePickOneOpen}
        onClose={() => setIsHelpMePickOneOpen(false)}
        restaurants={[getRecommendations.fast, getRecommendations.safe, getRecommendations.new].filter((r): r is Restaurant => r !== null && r !== undefined)}
        userCoords={userCoords}
        onSelectRestaurant={(r) => {
          setLastPicked(r);
          setShowRatingFeedback(false);
          setStep('rating');
          setIsHelpMePickOneOpen(false);
        }}
      />
    </div>
  );
}
