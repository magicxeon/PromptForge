export function registerIdentityRoutes(app, {
  mockUserRepo,
  communityFeaturePolicyService
}) {
  app.get('/api/me', (req, res) => {
    res.json(req.actorContext || null);
  });

  app.get('/api/mock-users', async (req, res) => {
    try {
      const features = await communityFeaturePolicyService.getPublicFlags();
      if (process.env.MPF_ENABLE_MOCK_USERS === 'false'
        || features.development.mockActorSwitcherEnabled !== true) {
        return res.json({ enabled: false, users: [] });
      }
      const activeUsers = await mockUserRepo.listActiveUsers();
      const sanitized = activeUsers.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        activeCreatorProfileId: user.activeCreatorProfileId || null,
        featureFlags: Array.isArray(user.featureFlags) ? user.featureFlags : []
      }));
      res.json({ enabled: true, users: sanitized });
    } catch {
      res.status(500).json({ error: 'Failed to fetch mock users' });
    }
  });
}
