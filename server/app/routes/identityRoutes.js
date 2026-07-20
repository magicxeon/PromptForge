export function registerIdentityRoutes(app, { mockUserRepo }) {
  app.get('/api/me', (req, res) => {
    res.json(req.actorContext || null);
  });

  app.get('/api/mock-users', async (req, res) => {
    try {
      const activeUsers = await mockUserRepo.listActiveUsers();
      const sanitized = activeUsers.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      }));
      res.json({ enabled: true, users: sanitized });
    } catch {
      res.status(500).json({ error: 'Failed to fetch mock users' });
    }
  });
}
