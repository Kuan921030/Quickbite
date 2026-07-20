import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  LogIn,
  Award,
  Ticket,
  BarChart3,
  Clock,
  Lock,
  UserPlus,
  Coins,
  Flame,
  CheckCircle2,
  Tag,
  ChefHat,
  RefreshCw,
} from 'lucide-react';
import { UserSession } from '../../types/index';
import { userService } from '../../services/userService';
import { authRepository } from '../../repositories/index';

interface MemberCenterProps {
  isOpen?: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onLoginStateChange?: (user: UserSession | null) => void;
}

let memberCenterRenderCount = 0;

export const MemberCenter = ({
  isOpen,
  onClose,
  currentUser,
  onLoginStateChange,
}: MemberCenterProps) => {
  const user = currentUser;
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (import.meta.env.DEV) {
    memberCenterRenderCount++;
    if (memberCenterRenderCount <= 50) {
      console.log(`[Dev Audit] MemberCenter render count: ${memberCenterRenderCount}`);
    } else if (memberCenterRenderCount === 51) {
      console.warn(`[Dev Audit] MemberCenter rendered at extremely high frequency! Stopped logging.`);
    }
  }

  const saveAndSyncUserSession = async (u: UserSession | null) => {
    await userService.saveUserSession(u);
    if (onLoginStateChange) onLoginStateChange(u);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await authRepository.signInWithGoogle();
      setSuccessMsg('登入成功！');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google 登入失敗');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const triggerOneClickDemo = async () => {
    // Only available in dev mode
    if (!import.meta.env.DEV) {
      setErrorMsg('Demo 帳號僅限於開發環境測試使用！');
      return;
    }
    const demoUser = await userService.loadDemoUser();
    await saveAndSyncUserSession(demoUser);
    setSuccessMsg('已成功載入台大航太系 demo 帳號！');
    setTimeout(() => setSuccessMsg(''), 1500);
  };

  const handleLogOut = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await authRepository.signOut();
      setSuccessMsg('已成功登出！');
      setTimeout(() => setSuccessMsg(''), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || '登出失敗');
    }
  };

  // Redeem point to coupon
  // MVP_DEMO_ONLY: Future secure point deduction and coupon generation must be processed by trusted backend
  const handleRedeemCoupon = async () => {
    if (!user) return;
    try {
      const { user: updatedUser, coupon } = await userService.redeemCoupon(user);
      await saveAndSyncUserSession(updatedUser);
      setSuccessMsg(`成功兌換 [ ${coupon.name} ] 優惠券優惠！`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || '兌換失敗');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  // Consume coupon
  // MVP_DEMO_ONLY: Coupon consumption verification and status update must be handled securely on the server
  const handleUseCoupon = async (id: string, name: string) => {
    if (!user) return;
    const updatedUser = await userService.useCoupon(user, id);
    await saveAndSyncUserSession(updatedUser);
    
    // Find matching coupon code
    const matchedCoupon = user.coupons.find(c => c.id === id);
    alert(
      `🎉 【${name}】 使用核銷成功！\n優惠碼：${
        matchedCoupon?.code || 'NTU-CODE'
      }`
    );
  };

  // Calculations for level progress
  const maxPointsForLevel = 600;
  const progressPercent = user
    ? Math.min(100, (user.points / maxPointsForLevel) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4"
      id="member-center-overlay"
    >
      {/* Overlay touch close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col z-[105]"
      >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <ChefHat className="text-brand-primary" size={24} />
              <h2 className="text-xl font-bold text-neutral-800">
                QuickBite 美食會員中心
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} className="text-neutral-500" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-2xl flex items-center gap-2">
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-2xl">
                ⚠️ {errorMsg}
              </div>
            )}

            {user ? (
              // Logged in UI
              <div className="space-y-6">
                {/* User Card */}
                <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 translate-x-4 -translate-y-4 opacity-10">
                    <Flame size={120} fill="currentColor" />
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.nickname} 
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center font-bold text-xl text-white shadow-md">
                        {user.nickname[0] || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-lg">{user.nickname}</h3>
                        <span className="bg-brand-primary/95 text-[10px] text-white px-2 py-0.5 rounded-full font-bold">
                          {user.tier}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{user.username}</p>
                    </div>
                  </div>

                  {/* Level Progress */}
                  <div className="mt-6 pt-4 border-t border-neutral-700/60 space-y-2 relative z-10">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">
                        美食家集點進度
                      </span>
                      <span className="font-bold text-brand-primary flex items-center gap-1">
                        <Coins size={12} className="fill-brand-primary/20" />
                        {user.points} / {maxPointsForLevel} 點
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full bg-neutral-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-primary h-full transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-neutral-400">
                      <span>下一等級：傳奇老饕</span>
                      <span>還差 {maxPointsForLevel - user.points} 點升級</span>
                    </div>
                  </div>
                </div>

                {/* MVP_DEMO_ONLY: Show disclaimer for test-phase coupons and points */}
                <div className="bg-orange-50/80 text-[#C2410C] text-[11px] font-bold p-3.5 rounded-2xl border border-orange-100/50 flex items-center gap-2 leading-relaxed shadow-sm">
                  <span className="text-sm shrink-0">ℹ️</span>
                  <span>目前為測試版體驗點數與示範優惠券，尚不具實際兌換價值。</span>
                </div>

                {/* Coupons Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Ticket size={14} /> 優惠券夾 (
                      {user.coupons.filter(c => !c.isUsed).length})
                    </h3>
                    <button
                      onClick={handleRedeemCoupon}
                      className="text-xs font-bold text-brand-primary hover:underline cursor-pointer flex items-center gap-1 py-1 px-2 rounded-lg bg-orange-50"
                    >
                      <Coins size={12} />
                      100 點兌換一張
                    </button>
                  </div>

                  {user.coupons.length === 0 ? (
                    <div className="text-center p-6 bg-neutral-50 rounded-2xl border border-neutral-100 text-neutral-400 text-xs">
                      目前沒有可用的優惠券，點點上方按鈕兌換一張吧！
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {user.coupons.map(coupon => (
                        <div
                          key={coupon.id}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                            coupon.isUsed
                              ? 'bg-neutral-50 border-neutral-100 opacity-60'
                              : 'bg-white border-neutral-100 shadow-sm hover:border-brand-primary/20'
                          }`}
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-neutral-800">
                                {coupon.name}
                              </span>
                              <span className="text-xs font-bold px-1.5 py-0.5 bg-orange-50 text-brand-primary rounded">
                                {coupon.discount}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500">
                              {coupon.description}
                            </p>
                          </div>
                          <button
                            disabled={coupon.isUsed}
                            onClick={() => handleUseCoupon(coupon.id, coupon.name)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                              coupon.isUsed
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                : 'bg-black text-white hover:bg-neutral-800'
                            }`}
                          >
                            {coupon.isUsed ? '已核銷' : '使用'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Habits Analysis section */}
                <div className="space-y-3.5 pt-2">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart3 size={14} /> 個人午餐精準數據分析
                  </h3>

                  <div className="bg-neutral-50 p-5 rounded-[2rem] border border-neutral-100 space-y-4">
                    {/* Top Visited Places */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-neutral-500 block">
                        🏆 最常去的商家統計
                      </span>
                      <div className="space-y-1.5">
                        {Object.entries(user.visitedCount).length === 0 ? (
                          <div className="text-xs text-neutral-400 py-1 italic">
                            尚無足夠的造訪數據，今天去一間看看吧！
                          </div>
                        ) : (
                          Object.entries(user.visitedCount)
                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                            .slice(0, 3)
                            .map(([name, count], index) => (
                              <div
                                key={name}
                                className="flex justify-between items-center text-xs"
                              >
                                <span className="text-neutral-700 font-medium">
                                  #{index + 1} {name}
                                </span>
                                <span className="font-semibold text-neutral-500">
                                  {count} 次造訪
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    {/* Genre selection Preference */}
                    <div className="space-y-2 pt-2 border-t border-neutral-200/50">
                      <span className="text-xs font-semibold text-neutral-500 block">
                        🍲 口味風格偏好
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-neutral-600">
                          <span>中式 / 台式便當</span>
                          <span className="font-bold">55%</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="bg-orange-500 h-full rounded-full"
                            style={{ width: '55%' }}
                          ></div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-neutral-600">
                          <span>日式美西風味</span>
                          <span className="font-bold">30%</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="bg-yellow-500 h-full rounded-full"
                            style={{ width: '30%' }}
                          ></div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-neutral-600">
                          <span>其他（韓、法、義式）</span>
                          <span className="font-bold">15%</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="bg-neutral-400 h-full rounded-full"
                            style={{ width: '15%' }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Price and speed parameters */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-200/50">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 block uppercase">
                          💵 偏好價位區間
                        </span>
                        <span className="text-xs font-bold text-neutral-700">
                          ~300 元等級
                        </span>
                        <p className="text-[10px] text-neutral-400">
                          比例約佔 65%，極致CP值
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 block uppercase">
                          ⚡ 出餐與時間偏好
                        </span>
                        <span className="text-xs font-bold text-neutral-700">
                          偏好快出餐 (75%)
                        </span>
                        <p className="text-[10px] text-neutral-400">
                          平均用餐時長 40 分鐘
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Log Out button */}
                <div className="pt-2">
                  <button
                    onClick={handleLogOut}
                    className="w-full py-3 bg-neutral-50 hover:bg-neutral-100 hover:text-red-500 text-neutral-500 rounded-2xl font-bold text-sm tracking-wide transition-colors cursor-pointer text-center"
                  >
                    登出會員帳號
                  </button>
                </div>
              </div>
            ) : (
              // Login UI with Google Auth
              <div className="space-y-6">
                <div className="text-center space-y-2 py-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-brand-primary mx-auto">
                    <User size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-800">
                    歡迎來到吃午餐
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    透過 Google 帳號登入即可享有個人用餐口味精準分析、集點兌換台大校園與公館商圈特約名店折價券！
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className={`w-full py-4 border border-neutral-200 hover:bg-neutral-50 rounded-2xl font-bold text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center gap-3 shadow-sm ${
                      isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw size={18} className="animate-spin text-neutral-500" />
                        <span className="text-neutral-600">登入處理中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                        <span className="text-neutral-700">使用 Google 帳號快速登入</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Easy demo trigger for local development only */}
                {import.meta.env.DEV && (
                  <>
                    {/* Divider */}
                    <div className="relative flex items-center justify-center my-4">
                      <div className="w-full border-t border-neutral-100"></div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase bg-white px-3 absolute">
                        開發測試工具 (Development Only)
                      </span>
                    </div>

                    <button
                      onClick={triggerOneClickDemo}
                      className="w-full py-4 bg-orange-50 hover:bg-orange-100 border border-orange-100 text-brand-primary rounded-2xl font-bold text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Flame
                        size={16}
                        className="fill-brand-primary/20 animate-bounce"
                      />
                      一鍵體驗「台大航太郭小明」經典帳號
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
    </motion.div>
  );
};
export default MemberCenter;
