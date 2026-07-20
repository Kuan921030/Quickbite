import { recommendationEventRepository } from '../repositories/index';
import { RecommendationSession, RecommendationEvent } from '../types/index';

export const recommendationEventService = {
  async startSession(sessionData: {
    id: string;
    userId?: string;
    budget: number;
    distance: number;
    cuisine: string;
    group: string;
    hurry: boolean;
    recommendedRestaurantIds: string[];
  }): Promise<void> {
    const session: RecommendationSession = {
      id: sessionData.id,
      userId: sessionData.userId,
      budget: sessionData.budget,
      distance: sessionData.distance,
      cuisine: sessionData.cuisine,
      group: sessionData.group,
      hurry: sessionData.hurry,
      recommendedRestaurantIds: sessionData.recommendedRestaurantIds,
      createdAt: new Date().toISOString()
    };
    try {
      await recommendationEventRepository.saveSession(session);
    } catch (e) {
      console.error('[recommendationEventService] Failed to save session:', e);
    }
  },

  async logEvent(eventData: {
    sessionId: string;
    userId?: string;
    restaurantId: string;
    eventType: 'recommendation_shown' | 'restaurant_opened' | 'menu_opened' | 'google_maps_clicked' | 'rating_submitted' | 'mock_order_completed';
    ratingValue?: number;
    waitTimeCategory?: string;
  }): Promise<void> {
    const event: RecommendationEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      sessionId: eventData.sessionId,
      userId: eventData.userId,
      restaurantId: eventData.restaurantId,
      eventType: eventData.eventType,
      ratingValue: eventData.ratingValue,
      waitTimeCategory: eventData.waitTimeCategory,
      createdAt: new Date().toISOString()
    };
    try {
      await recommendationEventRepository.saveEvent(event);
    } catch (e) {
      console.error('[recommendationEventService] Failed to save event:', e);
    }
  }
};
