import { mockUserRepo } from '../identity/MockUserRepository.js';

export async function actorContextMiddleware(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const userIdHeader = req.headers['x-mpf-user-id'] || req.headers['x-mpf-user-id'.toLowerCase()];
  const requestIdHeader = req.headers['x-mpf-request-id'] || req.headers['x-mpf-request-id'.toLowerCase()];

  const requestId = requestIdHeader || 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  req.requestId = requestId;

  let targetUserId = userIdHeader;
  
  if (!targetUserId) {
    if (isProduction) {
      // Reject mutating request if unauthenticated in production
      const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
      if (isMutating) {
        return res.status(401).json({ error: 'Unauthenticated mutating request rejected in production' });
      }
      // Non-mutating default to anonymous guest
      req.actorContext = {
        userId: 'anonymous_user',
        username: 'anonymous',
        displayName: 'Anonymous Guest',
        role: 'user',
        activeCreatorProfileId: null,
        isMockActor: true,
        authProvider: 'mock',
        requestId,
        originalRequesterUserId: null
      };
      return next();
    } else {
      // In development, default to usr_demo
      targetUserId = 'usr_demo';
    }
  }

  try {
    const mockUser = await mockUserRepo.findById(targetUserId);
    if (!mockUser) {
      // Reject mutating requests for invalid user ids
      const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
      if (isMutating) {
        return res.status(401).json({ error: `Invalid user identity: ${targetUserId}` });
      }
      
      // Fallback
      req.actorContext = {
        userId: 'anonymous_user',
        username: 'anonymous',
        displayName: 'Anonymous Guest',
        role: 'user',
        activeCreatorProfileId: null,
        isMockActor: true,
        authProvider: 'mock',
        requestId,
        originalRequesterUserId: null
      };
      return next();
    }

    if (mockUser.status === 'disabled') {
      const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
      if (isMutating) {
        return res.status(403).json({ error: 'Forbidden: Account is disabled' });
      }
    }

    req.actorContext = mockUserRepo.toActorContext(mockUser, requestId);
    next();
  } catch (err) {
    console.error('[actorContextMiddleware] Resolution error:', err);
    res.status(500).json({ error: 'Internal identity resolution error' });
  }
}
