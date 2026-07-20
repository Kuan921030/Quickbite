import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, isConfigured } from '../lib/firebase';
import { AuthRepository, UnsubscribeFunction } from './interfaces';
import { UserProfile } from '../types/index';
import { userRepository } from './index';

// Helper to create a fallback UserProfile when Firestore write/load permissions are denied
export function createFallbackProfile(firebaseUser: FirebaseUser): UserProfile {
  return {
    id: firebaseUser.uid,
    username: firebaseUser.email || '',
    nickname: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Google 使用者',
    points: 150,
    tier: "青銅吃貨",
    mealsOrdered: 1,
    visitedCount: { "新會員體驗點": 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    photoURL: firebaseUser.photoURL || undefined
  };
}

// Helper to convert Firebase User to UserProfile
export async function convertFirebaseUserToProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const uid = firebaseUser.uid;
  const email = firebaseUser.email || '';
  
  // Try to load existing profile by UID or Email
  let profile = await userRepository.getUserProfileById(uid);
  if (!profile && email) {
    profile = await userRepository.getUserProfile(email);
  }
  
  const now = new Date().toISOString();
  
  if (!profile) {
    // First time login: Create new profile
    profile = {
      id: uid,
      username: email,
      nickname: firebaseUser.displayName || email.split('@')[0] || 'Google 使用者',
      points: 150,
      tier: "青銅吃貨",
      mealsOrdered: 1,
      visitedCount: { "新會員體驗點": 1 },
      createdAt: now,
      updatedAt: now,
      photoURL: firebaseUser.photoURL || undefined
    };
    
    await userRepository.saveUserProfile(profile);
    
    // Add welcome coupon
    try {
      await userRepository.addRedemption({
        id: "reg-c1-" + uid,
        userId: uid,
        couponId: "tpl-welcome",
        status: 'claimed',
        claimedAt: now
      });
    } catch (e) {
      console.error('Error adding welcome coupon:', e);
    }
  } else {
    // Existing profile found, update UID if it was username-based previously, and preserve photoURL/nickname
    let updated = false;
    if (profile.id !== uid) {
      profile.id = uid;
      updated = true;
    }
    if (firebaseUser.photoURL && profile.photoURL !== firebaseUser.photoURL) {
      profile.photoURL = firebaseUser.photoURL;
      updated = true;
    }
    if (updated) {
      profile.updatedAt = now;
      await userRepository.saveUserProfile(profile);
    }
  }
  
  return profile;
}

function isProfileEqual(p1: UserProfile | null, p2: UserProfile | null): boolean {
  if (p1 === p2) return true;
  if (!p1 || !p2) return false;
  
  if (p1.id !== p2.id) return false;
  if (p1.username !== p2.username) return false;
  if (p1.nickname !== p2.nickname) return false;
  if (p1.points !== p2.points) return false;
  if (p1.tier !== p2.tier) return false;
  if (p1.mealsOrdered !== p2.mealsOrdered) return false;
  if (p1.photoURL !== p2.photoURL) return false;
  if (p1.createdAt !== p2.createdAt) return false;
  
  // Compare visitedCount
  const keys1 = Object.keys(p1.visitedCount || {});
  const keys2 = Object.keys(p2.visitedCount || {});
  if (keys1.length !== keys2.length) return false;
  for (const k of keys1) {
    if (p1.visitedCount[k] !== p2.visitedCount[k]) return false;
  }
  
  return true;
}

let authStateCallbackCount = 0;
let lastAuthStateCallbackTime = 0;
let authListenerSubscribedCount = 0;

export class FirebaseAuthRepository implements AuthRepository {
  private currentUser: UserProfile | null = null;
  private listeners: Set<(user: UserProfile | null) => void> = new Set();
  private isInitialized = false;
  private initPromise: Promise<UserProfile | null> | null = null;

  constructor() {
    // Setup onAuthStateChanged listener to automatically synchronize Firebase Auth state with our app
    if (isConfigured) {
      this.initPromise = new Promise((resolve) => {
        onAuthStateChanged(auth, async (firebaseUser) => {
          authStateCallbackCount++;
          if (import.meta.env.DEV) {
            if (authStateCallbackCount <= 50) {
              console.log(`[Dev Audit] auth state callback count: ${authStateCallbackCount}`);
            } else if (authStateCallbackCount === 51) {
              console.warn(`[Dev Audit] auth state callback triggered at extremely high frequency! Stopped logging.`);
            }
          }

          const nowMs = Date.now();
          if (authStateCallbackCount > 25 && nowMs - lastAuthStateCallbackTime < 2000) {
            console.error(`[Security Guard] Recursive auth loop detected! Suspended processing to prevent browser crash.`);
            resolve(null);
            return;
          }
          lastAuthStateCallbackTime = nowMs;

          if (firebaseUser) {
            try {
              const profile = await convertFirebaseUserToProfile(firebaseUser);
              if (!isProfileEqual(this.currentUser, profile)) {
                this.currentUser = profile;
                this.isInitialized = true;
                this.notifyListeners();
              } else {
                this.isInitialized = true;
              }
            } catch (error) {
              console.error('[Diagnostic] Error converting firebase user on auth state change, using fallback:', error);
              const fallback = createFallbackProfile(firebaseUser);
              if (!isProfileEqual(this.currentUser, fallback)) {
                this.currentUser = fallback;
                this.isInitialized = true;
                this.notifyListeners();
              } else {
                this.isInitialized = true;
              }
            }
          } else {
            if (this.currentUser !== null) {
              this.currentUser = null;
              this.isInitialized = true;
              this.notifyListeners();
            } else {
              this.isInitialized = true;
            }
          }
          
          resolve(this.currentUser);
        }, (error) => {
          console.error('onAuthStateChanged error:', error);
          this.isInitialized = true;
          this.currentUser = null;
          this.notifyListeners();
          resolve(null);
        });
      });
    } else {
      this.isInitialized = true;
      this.initPromise = Promise.resolve(null);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    if (!isConfigured) {
      console.warn('Firebase is not configured. getCurrentUser returning null.');
      return null;
    }
    
    // If auth state is already initialized and we have a user/null, return it
    if (this.isInitialized) {
      return this.currentUser;
    }

    return this.initPromise;
  }

  async setCurrentUser(user: UserProfile | null): Promise<void> {
    // If the caller sets null, perform sign out from Firebase
    if (user === null) {
      await this.signOut();
    } else {
      if (isProfileEqual(this.currentUser, user)) {
        return;
      }
      this.currentUser = user;
      this.notifyListeners();
    }
  }

  subscribeToAuthState(callback: (user: UserProfile | null) => void): UnsubscribeFunction {
    authListenerSubscribedCount++;
    if (import.meta.env.DEV) {
      if (authListenerSubscribedCount <= 50) {
        console.log(`[Dev Audit] auth listener subscribed count: ${authListenerSubscribedCount}`);
      } else if (authListenerSubscribedCount === 51) {
        console.warn(`[Dev Audit] extremely high auth listener subscription frequency detected! Stopped logging.`);
      }
    }

    this.listeners.add(callback);
    // Call immediately if already initialized
    if (this.isInitialized) {
      callback(this.currentUser);
    } else {
      // Or call when initialized
      this.getCurrentUser().then(user => {
        if (this.listeners.has(callback)) {
          callback(user);
        }
      });
    }
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  async signInWithGoogle(): Promise<UserProfile> {
    if (!isConfigured) {
      throw new Error('Firebase configuration is missing! Please configure environment variables.');
    }
    
    let result;
    try {
      result = await signInWithPopup(auth, googleProvider);
      console.log('[Diagnostic] Google signInWithPopup successful! UID:', result.user.uid, 'Email:', result.user.email);
    } catch (error: any) {
      console.error('[Diagnostic] Google signInWithPopup failed:', error);
      // Map Firebase Auth errors to user-friendly messages
      let customErrorMsg = 'Google 登入失敗：' + (error.message || error);
      if (error.code === 'auth/popup-closed-by-user') {
        customErrorMsg = '登入取消：使用者關閉了登入視窗。';
      } else if (error.code === 'auth/popup-blocked') {
        customErrorMsg = 'popup 被封鎖：請允許瀏覽器彈出視窗以完成 Google 登入。';
      } else if (error.code === 'auth/network-request-failed') {
        customErrorMsg = '網路錯誤：請檢查您的網路連線。';
      } else if (error.code === 'auth/cancelled-popup-request') {
        customErrorMsg = '登入處理中：已有另一個登入視窗正在開啟。';
      }
      throw new Error(customErrorMsg);
    }

    try {
      const profile = await convertFirebaseUserToProfile(result.user);
      this.currentUser = profile;
      this.notifyListeners();
      return profile;
    } catch (error: any) {
      console.error('[Diagnostic] convertFirebaseUserToProfile failed after successful Google Auth:', error);
      const fallback = createFallbackProfile(result.user);
      console.log('[Diagnostic] Falling back to temporary local profile:', fallback);
      this.currentUser = fallback;
      this.notifyListeners();
      return fallback;
    }
  }

  async signOut(): Promise<void> {
    if (isConfigured) {
      await firebaseSignOut(auth);
    }
    this.currentUser = null;
    this.notifyListeners();
  }
}
