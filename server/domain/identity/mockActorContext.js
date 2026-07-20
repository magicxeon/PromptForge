/**
 * mockActorContext - Pure helper functions for system and fallback actor contexts
 */

export function createSystemActorContext(originalRequesterUserId = null, requestId = null) {
  return {
    userId: 'system_agent',
    username: 'system',
    displayName: 'System Process',
    role: 'support',
    activeCreatorProfileId: null,
    isMockActor: false,
    authProvider: 'system',
    requestId: requestId || 'req_sys_' + Math.random().toString(36).substring(2, 9),
    originalRequesterUserId: originalRequesterUserId || null
  };
}

export function createAnonymousDeniedContext(requestId = null) {
  return null;
}

export function normalizeActorContext(input) {
  if (!input || typeof input !== 'object') {
    return {
      userId: 'anonymous_user',
      username: 'anonymous',
      displayName: 'Anonymous Guest',
      role: 'user',
      activeCreatorProfileId: null,
      isMockActor: true,
      authProvider: 'mock',
      requestId: 'req_anon_' + Math.random().toString(36).substring(2, 9),
      originalRequesterUserId: null
    };
  }

  return {
    userId: input.userId || 'anonymous_user',
    username: input.username || 'anonymous',
    displayName: input.displayName || 'Anonymous Guest',
    role: input.role || 'user',
    activeCreatorProfileId: input.activeCreatorProfileId || null,
    isMockActor: input.isMockActor !== false,
    authProvider: input.authProvider || 'mock',
    requestId: input.requestId || 'req_norm_' + Math.random().toString(36).substring(2, 9),
    originalRequesterUserId: input.originalRequesterUserId || null
  };
}
