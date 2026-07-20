import {
  AuthRepository,
  UserRepository,
  FavoriteRepository,
  RecommendationEventRepository
} from './interfaces';
import {
  LocalFavoriteRepository
} from './localImplementations';
import { FirebaseAuthRepository } from './firebaseAuthRepository';
import { FirebaseUserRepository } from './firebaseUserRepository';
import { FirebaseRecommendationEventRepository } from './firebaseRecommendationEventRepository';

// Export interfaces for services to use
export * from './interfaces';

// Export concrete singletons typed strictly as interfaces to ensure full backend-swappability
export const authRepository: AuthRepository = new FirebaseAuthRepository();
export const userRepository: UserRepository = new FirebaseUserRepository();
export const favoriteRepository: FavoriteRepository = new LocalFavoriteRepository();
export const recommendationEventRepository: RecommendationEventRepository = new FirebaseRecommendationEventRepository();

