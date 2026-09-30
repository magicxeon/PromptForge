import { mockUserRepo } from '../../repositories/identity/MockUserRepository.js';

export class UserPreferenceError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UserPreferenceService {
  constructor({ userRepository = mockUserRepo } = {}) {
    this.userRepository = userRepository;
  }

  async getPreferences(actorContext) {
    const userId = requireUserId(actorContext);
    const user = await this.userRepository.findById(userId);
    return projectPreferences(requireUser(user));
  }

  async updatePreferences(input, actorContext) {
    const userId = requireUserId(actorContext);
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).length !== 1
      || !Object.hasOwn(input, 'confirmCreditUsage')
      || typeof input.confirmCreditUsage !== 'boolean') {
      throw new UserPreferenceError('user_preferences_invalid', 'Expected only confirmCreditUsage as a boolean.', 400);
    }
    const user = await this.userRepository.updatePreferences(userId, {
      confirmCreditUsage: input.confirmCreditUsage
    });
    return projectPreferences(requireUser(user));
  }
}

function requireUserId(actorContext) {
  if (typeof actorContext?.userId !== 'string' || !actorContext.userId.trim()) {
    throw new UserPreferenceError('user_preferences_actor_required', 'An authenticated actor is required.', 401);
  }
  return actorContext.userId;
}

function requireUser(user) {
  if (!user) throw new UserPreferenceError('user_preferences_user_not_found', 'User not found.', 404);
  return user;
}

function projectPreferences(user) {
  return { confirmCreditUsage: user.preferences?.confirmCreditUsage !== false };
}

export const userPreferenceService = new UserPreferenceService();
