import { UserPreferenceError, UserPreferenceService } from '../../domain/identity/UserPreferenceService.js';

export function registerIdentityRoutes(
  app,
  {
    mockUserRepo,
    communityFeaturePolicyService,
    identityApplicationService,
    userPreferenceService = new UserPreferenceService({
      userRepository: mockUserRepo,
      identityApplicationService,
    }),
  }
) {
  app.get('/api/me', (req, res) => {
    res.json(req.actorContext || null);
  });

  app.get('/api/me/preferences', async (req, res) => {
    try {
      res.json(await userPreferenceService.getPreferences(req.actorContext));
    } catch (error) {
      sendPreferenceError(res, error);
    }
  });

  app.patch('/api/me/preferences', async (req, res) => {
    try {
      if (identityApplicationService)
        await identityApplicationService.unsafe({
          cookieHeader: req.headers?.cookie ?? '',
          origin: req.headers?.origin,
          csrfToken: req.headers?.['x-csrf-token'],
        });
      res.json(await userPreferenceService.updatePreferences(req.body, req.actorContext));
    } catch (error) {
      sendPreferenceError(res, error);
    }
  });

  app.get('/api/mock-users', async (req, res) => {
    try {
      if (identityApplicationService) return res.json({ enabled: false, users: [] });
      const features = await communityFeaturePolicyService.getPublicFlags();
      if (
        process.env.MPF_ENABLE_MOCK_USERS === 'false' ||
        features.development.mockActorSwitcherEnabled !== true
      ) {
        return res.json({ enabled: false, users: [] });
      }
      const activeUsers = await mockUserRepo.listActiveUsers();
      const sanitized = activeUsers.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        activeCreatorProfileId: user.activeCreatorProfileId || null,
        featureFlags: Array.isArray(user.featureFlags) ? user.featureFlags : [],
      }));
      res.json({ enabled: true, users: sanitized });
    } catch {
      res.status(500).json({ error: 'Failed to fetch mock users' });
    }
  });
}

function sendPreferenceError(res, error) {
  if (
    ['auth_session_expired', 'auth_forbidden', 'auth_service_unavailable', 'auth_mfa_required'].includes(
      error?.code
    )
  )
    return res
      .status(
        error.code === 'auth_session_expired' ? 401 : error.code === 'auth_service_unavailable' ? 503 : 403
      )
      .json({ error: 'Authentication unavailable.', code: error.code });
  if (error instanceof UserPreferenceError) {
    return res.status(error.statusCode).json({ error: error.message, code: error.code });
  }
  return res.status(500).json({
    error: 'Unable to access user preferences.',
    code: 'user_preferences_unavailable',
  });
}
