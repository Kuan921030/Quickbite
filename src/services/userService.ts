import { UserSession, Coupon } from '../types/index';
import { userRepository } from '../repositories/userRepository';

export const DEFAULT_DEMO_USER: UserSession = {
  username: "ntu_student@example.com",
  nickname: "台大航太系 郭小明",
  points: 450,
  tier: "星耀美食家",
  coupons: [
    { id: "c1", name: "水源市場水餃", discount: "送小菜 1 份", description: "限水源市場指定攤位使用", code: "NTU-DUMPLING-01", isUsed: false },
    { id: "c2", name: "小木屋鬆餅", discount: "九折折價券", description: "台大校內店限定，外送不適用", code: "NTU-WAFFLE-90", isUsed: false },
    { id: "c3", name: "公館陳三鼎（陳記）", discount: "免費折抵 10 元", description: "搭配推薦主餐使用", code: "NTU-MILKTEA-10", isUsed: false }
  ],
  mealsOrdered: 12,
  visitedCount: {
    "Este día 古巴三明治": 5,
    "孫東寶牛排": 3,
    "台大女九自助餐": 2,
    "活大麥當勞": 2
  }
};

export const COUPON_TEMPLATES = [
  { name: "姐妹花雞排", discount: "折價 10 元", description: "台大校內名店限定", code: "NTU-CHICKEN-10" },
  { name: "活大麥當勞", discount: "大薯買一送一", description: "限活動期間台大店兌換", code: "NTU-MCD-FRIES" },
  { name: "公館水源街水餃", discount: "滿百折 $15 元", description: "午餐時段特惠", code: "NTU-PIECE-15" },
  { name: "台大女九自助餐", discount: "免費招待湯品", description: "憑券享每日例湯升級", code: "NTU-SOUP-FREE" },
];

export const userService = {
  getUserSession(): UserSession | null {
    return userRepository.getUserSession();
  },

  saveUserSession(session: UserSession | null): void {
    userRepository.saveUserSession(session);
  },

  login(email: string): UserSession {
    const mockUser: UserSession = {
      username: email,
      nickname: email.split('@')[0],
      points: 150,
      tier: "青銅吃貨",
      coupons: [
        { id: "reg-c1", name: "新會員見面禮", discount: "全站折價 10 元", description: "無金額限制，有效期限 30 天", code: "NTU-WELCOME-10", isUsed: false }
      ],
      mealsOrdered: 1,
      visitedCount: { "新會員體驗點": 1 }
    };
    userRepository.saveUserSession(mockUser);
    return mockUser;
  },

  register(email: string, nickname: string): UserSession {
    const mockUser: UserSession = {
      username: email,
      nickname: nickname,
      points: 150,
      tier: "青銅吃貨",
      coupons: [
        { id: "reg-c1", name: "新會員見面禮", discount: "全站折價 10 元", description: "無金額限制並享免費外帶服務", code: "NTU-WELCOME-10", isUsed: false }
      ],
      mealsOrdered: 0,
      visitedCount: {}
    };
    userRepository.saveUserSession(mockUser);
    return mockUser;
  },

  loadDemoUser(): UserSession {
    userRepository.saveUserSession(DEFAULT_DEMO_USER);
    return DEFAULT_DEMO_USER;
  },

  addPoints(user: UserSession, points: number): UserSession {
    const updated = {
      ...user,
      points: user.points + points
    };
    userRepository.saveUserSession(updated);
    return updated;
  },

  recordOrder(user: UserSession, restaurantName: string): UserSession {
    const currentVisits = user.visitedCount[restaurantName] || 0;
    const updated: UserSession = {
      ...user,
      points: user.points + 100, // Earn 100 points for order
      mealsOrdered: user.mealsOrdered + 1,
      visitedCount: {
        ...user.visitedCount,
        [restaurantName]: currentVisits + 1
      }
    };
    userRepository.saveUserSession(updated);
    return updated;
  },

  redeemCoupon(user: UserSession): { user: UserSession; coupon: Coupon } {
    if (user.points < 100) {
      throw new Error("您的點數不足 100 點，快去探索美食累積點數吧！");
    }

    const template = COUPON_TEMPLATES[Math.floor(Math.random() * COUPON_TEMPLATES.length)];
    const newCoupon: Coupon = {
      id: "rdm-" + Date.now(),
      name: template.name,
      discount: template.discount,
      description: template.description,
      code: template.code,
      isUsed: false
    };

    const updatedUser = {
      ...user,
      points: user.points - 100,
      coupons: [newCoupon, ...user.coupons]
    };

    userRepository.saveUserSession(updatedUser);
    return { user: updatedUser, coupon: newCoupon };
  },

  useCoupon(user: UserSession, couponId: string): UserSession {
    const updatedCoupons = user.coupons.map(c => {
      if (c.id === couponId) return { ...c, isUsed: true };
      return c;
    });

    const updatedUser = {
      ...user,
      coupons: updatedCoupons
    };

    userRepository.saveUserSession(updatedUser);
    return updatedUser;
  }
};
