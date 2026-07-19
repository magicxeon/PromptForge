export function registerCreditRoutes(app, { creditManager, resolveRequestUsername }) {
  app.get('/api/credits', async (req, res) => {
    try {
      const username = resolveRequestUsername(req, { allowBody: false });
      const info = await creditManager.getUserInfo(username);
      res.json(info);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  app.post('/api/credits/recharge', async (req, res) => {
    try {
      const targetUser = resolveRequestUsername(req, { allowQuery: false });
      res.json(await creditManager.recharge(targetUser, 10));
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: `Recharge failed: ${err.message}` });
    }
  });
}
