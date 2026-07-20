import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile, Coupon, Redemption } from '../types/index';
import { UserRepository } from './interfaces';
import { LocalUserRepository } from './localImplementations';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class FirebaseUserRepository implements UserRepository {
  private localRepo = new LocalUserRepository();

  async getUserProfile(username: string): Promise<UserProfile | null> {
    const currentUser = auth.currentUser;
    // If the authenticated user matches the requested username, use their UID to fetch from Firestore
    if (currentUser && currentUser.email === username) {
      return this.getUserProfileById(currentUser.uid);
    }
    
    // Otherwise fallback to local repository
    return this.localRepo.getUserProfile(username);
  }

  async getUserProfileById(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    const projectId = db.app.options.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const currentUid = auth.currentUser?.uid;

    console.log(`[Firestore Diagnostic] getDoc started:`, {
      projectId,
      path,
      currentUserUid: currentUid
    });

    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      console.log(`[Firestore Diagnostic] getDoc succeeded:`, {
        projectId,
        path,
        currentUserUid: currentUid,
        exists: docSnap.exists()
      });

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: data.id,
          username: data.username,
          nickname: data.nickname,
          points: Number(data.points),
          tier: data.tier,
          mealsOrdered: Number(data.mealsOrdered || 0),
          visitedCount: data.visitedCount || {},
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          photoURL: data.photoURL || undefined
        };
      }
    } catch (error: any) {
      console.error(`[Firestore Diagnostic] getDoc failed:`, {
        projectId,
        path,
        currentUserUid: currentUid,
        errorCode: error?.code || 'unknown',
        errorMessage: error?.message || String(error)
      });

      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (logErr) {
        console.error(`[FirebaseUserRepository] Detailed Diagnostic:`, logErr);
      }
      
      // Fallback to local storage if firestore is unavailable or rules prevent access
      return this.localRepo.getUserProfileById(userId);
    }

    // Firestore call succeeded but no user profile document exists yet.
    // Try to migrate from localStorage if an existing profile is present.
    try {
      const localProfile = await this.localRepo.getUserProfileById(userId);
      if (localProfile) {
        console.log(`[FirebaseUserRepository] Migrating profile for ${userId} from localStorage to Firestore...`);
        // Migrate to firestore
        await this.saveUserProfile(localProfile);
        return localProfile;
      }
    } catch (migrationError) {
      console.error(`[FirebaseUserRepository] Migration from localStorage failed:`, migrationError);
    }

    return null;
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const userId = profile.id;
    const path = `users/${userId}`;
    const projectId = db.app.options.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const currentUid = auth.currentUser?.uid;

    console.log(`[Firestore Diagnostic] setDoc started:`, {
      projectId,
      path,
      currentUserUid: currentUid
    });

    try {
      const docRef = doc(db, 'users', userId);
      const dataToSave = {
        id: profile.id || userId,
        username: profile.username || auth.currentUser?.email || '',
        nickname: profile.nickname || 'Google 使用者',
        points: typeof profile.points === 'number' ? Math.max(0, Math.floor(profile.points)) : 150,
        tier: profile.tier || "青銅吃貨",
        mealsOrdered: typeof profile.mealsOrdered === 'number' ? Math.max(0, Math.floor(profile.mealsOrdered)) : 1,
        visitedCount: profile.visitedCount || { "新會員體驗點": 1 },
        createdAt: profile.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        photoURL: profile.photoURL || null
      };
      
      if (import.meta.env.DEV) {
        const payloadMeta = Object.keys(dataToSave).map(key => {
          const val = (dataToSave as any)[key];
          let valType: string = typeof val;
          if (val === null) valType = 'null';
          else if (Array.isArray(val)) valType = 'array';
          return { field: key, type: valType };
        });
        console.log(`[Firestore Diagnostic Dev] setDoc payload metadata:`, {
          uid: userId,
          path: path,
          fields: payloadMeta
        });
      }

      await setDoc(docRef, dataToSave);
      
      console.log(`[Firestore Diagnostic] setDoc succeeded:`, {
        projectId,
        path,
        currentUserUid: currentUid
      });

      // Also cache/save to local storage so that offline fallbacks work
      await this.localRepo.saveUserProfile(profile);
    } catch (error: any) {
      console.error(`[Firestore Diagnostic] setDoc failed:`, {
        projectId,
        path,
        currentUserUid: currentUid,
        errorCode: error?.code || 'unknown',
        errorMessage: error?.message || String(error)
      });

      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (logErr) {
        console.error(`[FirebaseUserRepository] Detailed Diagnostic:`, logErr);
      }
      
      // Fallback locally as fallback but THROW the error so it is NOT swallowed!
      await this.localRepo.saveUserProfile(profile);
      throw error;
    }
  }

  // Delegate Coupons & Redemptions to the local repository as specified (do not move other data in this phase)
  async getCoupons(): Promise<Coupon[]> {
    return this.localRepo.getCoupons();
  }

  async getUserRedemptions(userId: string): Promise<Redemption[]> {
    return this.localRepo.getUserRedemptions(userId);
  }

  async addRedemption(redemption: Redemption): Promise<void> {
    return this.localRepo.addRedemption(redemption);
  }

  async updateRedemption(redemption: Redemption): Promise<void> {
    return this.localRepo.updateRedemption(redemption);
  }
}
