import { doc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { RecommendationSession, RecommendationEvent } from '../types/index';
import { RecommendationEventRepository } from './interfaces';
import { LocalRecommendationEventRepository } from './localImplementations';

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
  };
}

interface FirestoreSessionDoc {
  id: string;
  userId: string;
  budget: number;
  distance: number;
  cuisine: string;
  group: string;
  hurry: boolean;
  recommendedRestaurantIds: string[];
  createdAt: object;
}

interface FirestoreEventDoc {
  id: string;
  sessionId: string;
  userId: string;
  restaurantId: string;
  eventType: string;
  createdAt: object;
  ratingValue?: number;
  waitTimeCategory?: string;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Event Log Error: ', JSON.stringify(errInfo));
}

export class FirebaseRecommendationEventRepository implements RecommendationEventRepository {
  private localRepo = new LocalRecommendationEventRepository();

  async saveSession(session: RecommendationSession): Promise<void> {
    // Always save to local storage as fallback or local backup
    await this.localRepo.saveSession(session);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      // Non-logged in users do not get recorded to Firestore
      return;
    }

    const uid = currentUser.uid;
    const path = `users/${uid}/recommendationSessions/${session.id}`;

    try {
      const docRef = doc(db, 'users', uid, 'recommendationSessions', session.id);
      
      const payload: FirestoreSessionDoc = {
        id: session.id,
        userId: uid,
        budget: Number(session.budget),
        distance: Number(session.distance),
        cuisine: session.cuisine,
        group: session.group,
        hurry: Boolean(session.hurry),
        recommendedRestaurantIds: session.recommendedRestaurantIds || [],
        createdAt: serverTimestamp()
      };

      await setDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async saveEvent(event: RecommendationEvent): Promise<void> {
    // Always save to local storage as fallback or local backup
    await this.localRepo.saveEvent(event);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      // Non-logged in users do not get recorded to Firestore
      return;
    }

    const uid = currentUser.uid;
    const path = `users/${uid}/recommendationSessions/${event.sessionId}/events/${event.id}`;

    try {
      const docRef = doc(db, 'users', uid, 'recommendationSessions', event.sessionId, 'events', event.id);

      const eventType = event.eventType;
      if (!eventType) {
        console.warn('[FirebaseRecommendationEventRepository] Event type is required for Firestore analytic logging.');
        return;
      }

      const payload: FirestoreEventDoc = {
        id: event.id,
        sessionId: event.sessionId,
        userId: uid,
        restaurantId: event.restaurantId,
        eventType: eventType,
        createdAt: serverTimestamp()
      };

      if (eventType === 'rating_submitted') {
        if (typeof event.ratingValue === 'number') {
          payload.ratingValue = event.ratingValue;
        }
        if (typeof event.waitTimeCategory === 'string') {
          payload.waitTimeCategory = event.waitTimeCategory;
        }
      }

      await setDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async getSessions(userId?: string): Promise<RecommendationSession[]> {
    const currentUser = auth.currentUser;
    if (!currentUser || (userId && userId !== currentUser.uid)) {
      return this.localRepo.getSessions(userId);
    }

    const uid = currentUser.uid;
    const path = `users/${uid}/recommendationSessions`;

    try {
      const querySnap = await getDocs(collection(db, 'users', uid, 'recommendationSessions'));
      const sessions: RecommendationSession[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        const firestoreTimestamp = data.createdAt as { toDate?: () => Date } | null;
        sessions.push({
          id: data.id as string,
          userId: data.userId as string,
          budget: Number(data.budget),
          distance: Number(data.distance),
          cuisine: data.cuisine as string,
          group: data.group as string,
          hurry: Boolean(data.hurry),
          recommendedRestaurantIds: (data.recommendedRestaurantIds as string[]) || [],
          createdAt: firestoreTimestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      return sessions;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return this.localRepo.getSessions(userId);
    }
  }

  async getEvents(sessionId: string): Promise<RecommendationEvent[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return this.localRepo.getEvents(sessionId);
    }

    const uid = currentUser.uid;
    const path = `users/${uid}/recommendationSessions/${sessionId}/events`;

    try {
      const querySnap = await getDocs(collection(db, 'users', uid, 'recommendationSessions', sessionId, 'events'));
      const events: RecommendationEvent[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        const firestoreTimestamp = data.createdAt as { toDate?: () => Date } | null;
        events.push({
          id: data.id as string,
          sessionId: data.sessionId as string,
          userId: data.userId as string,
          restaurantId: data.restaurantId as string,
          eventType: data.eventType as 'recommendation_shown' | 'restaurant_opened' | 'menu_opened' | 'google_maps_clicked' | 'rating_submitted' | 'mock_order_completed',
          ratingValue: typeof data.ratingValue === 'number' ? data.ratingValue : undefined,
          waitTimeCategory: typeof data.waitTimeCategory === 'string' ? data.waitTimeCategory : undefined,
          createdAt: firestoreTimestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      return events;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return this.localRepo.getEvents(sessionId);
    }
  }
}
