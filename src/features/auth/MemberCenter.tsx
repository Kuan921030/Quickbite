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
} from 'lucide-react';
import { UserSession } from '../../types/index';
import { userService } from '../../services/userService';

interface MemberCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginStateChange?: (user: UserSession | null) => void;
}

export const MemberCenter = ({
  isOpen,
  onClose,
  onLoginStateChange,
}: MemberCenterProps) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Local storage load
  useEffect(() => {
    const savedUser = userService.getUserSession();
    if (savedUser) {
      setUser(savedUser);
      if (onLoginStateChange) onLoginStateChange(savedUser);
    }
  }, []);

  const saveAndSyncUserSession = (u: UserSession | null) => {
    setUser(u);
    userService.saveUserSession(u);
    if (onLoginStateChange) onLoginStateChange(u);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('請輸入帳號密碼！');
      return;
    }

    const mockUser = userService.login(email);
    setErrorMsg('');
    saveAndSyncUserSession(mockUser);
    setSuccessMsg('登入成功！');
    setTimeout(() => setSuccessMsg(''), 1500);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nicknameInput) {
      setErrorMsg('請填寫所有註冊欄位！');
      return;
    }

    const mockUser = userService.register(email, nicknameInput);
    setErrorMsg('');
    saveAndSyncUserSession(mockUser);
    setIsRegisterMode(false);
    setSuccessMsg('註冊並登入成功！');
    setTimeout(() => setSuccessMsg(''), 1500);
  };

  const triggerOneClickDemo = () => {
    const demoUser = userService.loadDemoUser();
    saveAndSyncUserSession(demoUser);
    setSuccessMsg('已成功載入台大航太系 demo 帳號！');
    setTimeout(() => setSuccessMsg(''), 1500);
  };

  const handleLogOut = () => {
    saveAndSyncUserSession(null);
    setEmail('');
    setPassword('');
    setNicknameInput('');
  };

  // Redeem point to coupon
  const handleRedeemCoupon = () => {
    if (!user) return;
    try {
      const { user: updatedUser, coupon } = userService.redeemCoupon(user);
      saveAndSyncUserSession(updatedUser);
      setSuccessMsg(`成功兌換 [ ${coupon.name} ] 優惠券優惠！`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || '兌換失敗');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  // Consume coupon
  const handleUseCoupon = (id: string, name: string) => {
    if (!user) return;
    const updatedUser = userService.useCoupon(user, id);
    saveAndSyncUserSession(updatedUser);
    
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4" id="member-center-overlay">
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
                    <div className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center font-bold text-xl text-white shadow-md animate-pulse">
                      {user.nickname[0] || 'U'}
                    </div>
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
              // Login / Register UI
              <div className="space-y-6">
                <div className="text-center space-y-2 py-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-brand-primary mx-auto">
                    <User size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-800">
                    {isRegisterMode
                      ? '加入 QuickBite 吃貨俱樂部'
                      : '歡迎回來吃午餐'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    登入即可享有個人用餐口味精準分析、集點兌換台大校園與公館商圈特約名店折價券！
                  </p>
                </div>

                <form
                  onSubmit={isRegisterMode ? handleRegister : handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 block">
                      電子郵件 / 帳號
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. ntu_student@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 focus:border-brand-primary outline-none transition-colors rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 block">
                      設定密碼
                    </label>
                    <input
                      type="password"
                      placeholder="請輸入密碼"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAFAFA] border border-neutral-100 focus:border-brand-primary outline-none transition-colors rounded-xl text-sm"
                    />
                  </div>

                  {isRegisterMode && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-400 block">
                        會員暱稱嗎？
                      </label>
                      <input
                        type="text"
                        placeholder="例如：生機系王大明"
                        value={nicknameInput}
                        onChange={e => setNicknameInput(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 focus:border-brand-primary outline-none transition-colors rounded-xl text-sm"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-4 bg-black text-white rounded-2xl font-bold text-sm tracking-wide hover:bg-neutral-800 transition-colors cursor-pointer mt-2"
                  >
                    {isRegisterMode ? '註冊新帳號' : '登入會員'}
                  </button>
                </form>

                {/* Switch Login Register Modes */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode);
                      setErrorMsg('');
                    }}
                    className="text-xs text-neutral-400 font-bold hover:text-neutral-700"
                  >
                    {isRegisterMode
                      ? '已有帳號？點此快速登入'
                      : '還不是會員嗎？點此 5 秒鐘註冊'}
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="w-full border-t border-neutral-100"></div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase bg-white px-3 absolute">
                    或者快速體驗
                  </span>
                </div>

                {/* Easy demo trigger */}
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
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default MemberCenter;
