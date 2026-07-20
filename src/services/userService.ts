import { UserSession, UICoupon, UserProfile, Redemption } from '../types/index';
import { authRepository, userRepository } from '../repositories/index';
import { getStableUserId } from '../repositories/localImplementations';

export const DEFAULT_DEMO_USER: UserSession = {
  username: "ntu_student@example.com",
  nickname: "台大航太系 郭小明",
  points: 450,
  tier: "星耀美食家",
  coupons: [
    { id: "c1-demo", name: "水源市場水餃", discount: "送小菜 1 份", description: "限水源市場指定攤位使用", code: "NTU-DUMPLING-01", isUsed: false, status: 'claimed', claimedAt: "2026-07-19T00:00:00.000Z" },
    { id: "c2-demo", name: "小木屋鬆餅", discount: "九折折價券", description: "台大校內店限定，外送不適用", code: "NTU-WAFFLE-90", isUsed: false, status: 'claimed', claimedAt: "2026-07-19T00:00:00.000Z" },
    { id: "c3-demo", name: "公館陳三鼎（陳記）", discount: "免費折抵 10 元", description: "搭配推薦主餐使用", code: "NTU-MILKTEA-10", isUsed: false, status: 'claimed', claimedAt: "2026-07-19T00:00:00.000Z" }
  ],
  mealsOrdered: 12,
  visitedCount: {
    "Este día 古巴三明治": 5,
    "孫東寶牛排": 3,
    "台大女九自助餐": 2,
    "活大麥當勞": 2
  }
};

export const userService = {
  async getUserSession(): Promise<UserSession | null> {
    const userProfile = await authRepository.getCurrentUser();
    if (!userProfile) return null;
    
    // Load redemptions and map them to UICoupon objects
    const redemptions = await userRepository.getUserRedemptions(userProfile.id);
    const coupons = await userRepository.getCoupons();
    
    const userCoupons: UICoupon[] = redemptions.map(r => {
      const coupon = coupons.find(c => c.id === r.couponId);
      return {
        id: r.id,
        name: coupon?.name || '',
        discount: coupon?.discount || '',
        description: coupon?.description || '',
        code: coupon?.code || '',
        isUsed: r.status === 'used',
        status: r.status,
        claimedAt: r.claimedAt,
        usedAt: r.usedAt
      };
    });

    return {
      username: userProfile.username,
      points: userProfile.points,
      tier: userProfile.tier,
      nickname: userProfile.nickname,
      coupons: userCoupons,
      mealsOrdered: userProfile.mealsOrdered,
      visitedCount: userProfile.visitedCount,
      photoURL: userProfile.photoURL
    };
  },

  async saveUserSession(session: UserSession | null): Promise<void> {
    if (!session) {
      await authRepository.setCurrentUser(null);
      return;
    }
    
    const stableId = getStableUserId(session.username);
    const existingProfile = await userRepository.getUserProfile(session.username);
    const now = new Date().toISOString();

    const profile: UserProfile = {
      id: stableId,
      username: session.username,
      nickname: session.nickname,
      points: session.points,
      tier: session.tier,
      mealsOrdered: session.mealsOrdered,
      visitedCount: session.visitedCount,
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now,
      photoURL: session.photoURL
    };
    
    await userRepository.saveUserProfile(profile);
    await authRepository.setCurrentUser(profile);
    
    // Save or update redemptions in DB if they changed
    const existingRedemptions = await userRepository.getUserRedemptions(stableId);
    
    for (const c of session.coupons) {
      const found = existingRedemptions.find(r => r.id === c.id);
      if (found) {
        const expectedStatus = c.isUsed ? 'used' : c.status || 'claimed';
        if (found.status !== expectedStatus) {
          await userRepository.updateRedemption({
            ...found,
            status: expectedStatus,
            usedAt: expectedStatus === 'used' ? now : undefined
          });
        }
      } else {
        const coupons = await userRepository.getCoupons();
        const couponTemplate = coupons.find(tc => tc.code === c.code);
        const status = c.isUsed ? 'used' : c.status || 'claimed';
        await userRepository.addRedemption({
          id: c.id,
          userId: stableId,
          couponId: couponTemplate?.id || "tpl-welcome",
          status: status as 'claimed' | 'used' | 'expired',
          claimedAt: c.claimedAt || now,
          usedAt: status === 'used' ? now : undefined
        });
      }
    }
  },

  async login(email: string): Promise<UserSession> {
    let profile = await userRepository.getUserProfile(email);
    const stableId = getStableUserId(email);
    const now = new Date().toISOString();
    
    if (!profile) {
      profile = {
        id: stableId,
        username: email,
        nickname: email.split('@')[0],
        points: 150,
        tier: "青銅吃貨",
        mealsOrdered: 1,
        visitedCount: { "新會員體驗點": 1 },
        createdAt: now,
        updatedAt: now
      };
      await userRepository.saveUserProfile(profile);
      
      // Add welcome coupon
      await userRepository.addRedemption({
        id: "reg-c1-" + stableId,
        userId: stableId,
        couponId: "tpl-welcome",
        status: 'claimed',
        claimedAt: now
      });
    }
    
    await authRepository.setCurrentUser(profile);
    const session = await this.getUserSession();
    return session!;
  },

  async register(email: string, nickname: string): Promise<UserSession> {
    const stableId = getStableUserId(email);
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: stableId,
      username: email,
      nickname: nickname,
      points: 150,
      tier: "青銅吃貨",
      mealsOrdered: 0,
      visitedCount: {},
      createdAt: now,
      updatedAt: now
    };
    await userRepository.saveUserProfile(profile);
    
    // Add welcome coupon
    await userRepository.addRedemption({
      id: "reg-c1-" + stableId,
      userId: stableId,
      couponId: "tpl-welcome",
      status: 'claimed',
      claimedAt: now
    });
    
    await authRepository.setCurrentUser(profile);
    const session = await this.getUserSession();
    return session!;
  },

  async loadDemoUser(): Promise<UserSession> {
    const stableId = "user-demo-ntu";
    const now = new Date().toISOString();
    const demoProfile: UserProfile = {
      id: stableId,
      username: DEFAULT_DEMO_USER.username,
      nickname: DEFAULT_DEMO_USER.nickname,
      points: DEFAULT_DEMO_USER.points,
      tier: DEFAULT_DEMO_USER.tier,
      mealsOrdered: DEFAULT_DEMO_USER.mealsOrdered,
      visitedCount: DEFAULT_DEMO_USER.visitedCount,
      createdAt: now,
      updatedAt: now
    };
    await userRepository.saveUserProfile(demoProfile);
    
    // Add default coupons if they don't exist
    const existingRedemptions = await userRepository.getUserRedemptions(stableId);
    if (existingRedemptions.length === 0) {
      await userRepository.addRedemption({ id: "c1-demo", userId: stableId, couponId: "tpl-c1", status: 'claimed', claimedAt: now });
      await userRepository.addRedemption({ id: "c2-demo", userId: stableId, couponId: "tpl-c2", status: 'claimed', claimedAt: now });
      await userRepository.addRedemption({ id: "c3-demo", userId: stableId, couponId: "tpl-c3", status: 'claimed', claimedAt: now });
    }
    
    await authRepository.setCurrentUser(demoProfile);
    const session = await this.getUserSession();
    return session!;
  },

  // MVP_DEMO_ONLY: Point addition should be calculated and verified securely on the backend server
  async addPoints(user: UserSession, points: number): Promise<UserSession> {
    const profile = await userRepository.getUserProfile(user.username);
    if (profile) {
      profile.points += points;
      profile.updatedAt = new Date().toISOString();
      await userRepository.saveUserProfile(profile);
      
      const currentUser = await authRepository.getCurrentUser();
      if (currentUser && currentUser.username === user.username) {
        await authRepository.setCurrentUser(profile);
      }
    }
    const session = await this.getUserSession();
    return session || { ...user, points: user.points + points };
  },

  // MVP_DEMO_ONLY: Order logging, associated points addition, and visit counter incrementation must be strictly backend-validated
  async recordOrder(user: UserSession, restaurantName: string): Promise<UserSession> {
    const profile = await userRepository.getUserProfile(user.username);
    if (profile) {
      const currentVisits = profile.visitedCount[restaurantName] || 0;
      profile.points += 100;
      profile.mealsOrdered += 1;
      profile.visitedCount = {
        ...profile.visitedCount,
        [restaurantName]: currentVisits + 1
      };
      profile.updatedAt = new Date().toISOString();
      await userRepository.saveUserProfile(profile);
      
      const currentUser = await authRepository.getCurrentUser();
      if (currentUser && currentUser.username === user.username) {
        await authRepository.setCurrentUser(profile);
      }
    }
    const session = await this.getUserSession();
    return session || {
      ...user,
      points: user.points + 100,
      mealsOrdered: user.mealsOrdered + 1,
      visitedCount: {
        ...user.visitedCount,
        [restaurantName]: (user.visitedCount[restaurantName] || 0) + 1
      }
    };
  },

  // MVP_DEMO_ONLY: Points-to-coupon exchanges, stable transaction checks, and stock availability must be processed server-side
  async redeemCoupon(user: UserSession): Promise<{ user: UserSession; coupon: UICoupon }> {
    if (user.points < 100) {
      throw new Error("您的點數不足 100 點，快去探索美食累積點數吧！");
    }

    const templates = ["tpl-chicken", "tpl-mcd", "tpl-water", "tpl-women9"];
    const chosenTemplateId = templates[Math.floor(Math.random() * templates.length)];
    const coupons = await userRepository.getCoupons();
    const template = coupons.find(c => c.id === chosenTemplateId)!;
    
    const redemptionId = "rdm-" + Date.now();
    const stableId = getStableUserId(user.username);
    const now = new Date().toISOString();

    await userRepository.addRedemption({
      id: redemptionId,
      userId: stableId,
      couponId: template.id,
      status: 'claimed',
      claimedAt: now
    });

    // Deduct points
    const profile = await userRepository.getUserProfile(user.username);
    if (profile) {
      profile.points -= 100;
      profile.updatedAt = now;
      await userRepository.saveUserProfile(profile);
      
      const currentUser = await authRepository.getCurrentUser();
      if (currentUser && currentUser.username === user.username) {
        await authRepository.setCurrentUser(profile);
      }
    }

    const updatedUser = await this.getUserSession();
    const returnedCoupon: UICoupon = {
      id: redemptionId,
      name: template.name,
      discount: template.discount,
      description: template.description,
      code: template.code,
      isUsed: false,
      status: 'claimed',
      claimedAt: now
    };

    return { user: updatedUser!, coupon: returnedCoupon };
  },

  // MVP_DEMO_ONLY: Coupon verification and actual consumption must be validated securely on the backend server
  async useCoupon(user: UserSession, couponId: string): Promise<UserSession> {
    const stableId = getStableUserId(user.username);
    const redemptions = await userRepository.getUserRedemptions(stableId);
    const redemption = redemptions.find(r => r.id === couponId);
    if (redemption) {
      await userRepository.updateRedemption({
        ...redemption,
        status: 'used',
        usedAt: new Date().toISOString()
      });
    }

    const session = await this.getUserSession();
    return session || user;
  }
};
