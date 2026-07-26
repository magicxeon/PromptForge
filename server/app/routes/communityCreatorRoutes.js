function sendCreatorError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'creator_profile_failed',
      message: error.message || 'Creator profile operation failed.'
    }
  });
}

export function registerCommunityCreatorRoutes(app, {
  creatorProfileService,
  communityFeaturePolicyService
}) {
  const assertEnabled = () =>
    communityFeaturePolicyService.assertEnabled('community.creatorProfilesEnabled');

  app.get('/api/community/creator-profiles/me', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await creatorProfileService.getOwnProfile(req.actorContext));
    } catch (error) {
      return sendCreatorError(res, error);
    }
  });

  app.patch('/api/community/creator-profiles/me', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await creatorProfileService.updateOwnProfile(
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      return sendCreatorError(res, error);
    }
  });

  app.get('/api/community/creators/:handle', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await creatorProfileService.getPublicProfileByHandle(
        req.params.handle,
        req.actorContext
      ));
    } catch (error) {
      return sendCreatorError(res, error);
    }
  });

  app.get('/api/community/creators/:handle/posts', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await creatorProfileService.listPublicPortfolio(
        req.params.handle,
        req.query || {},
        req.actorContext
      ));
    } catch (error) {
      return sendCreatorError(res, error);
    }
  });

  app.post('/api/community/creators/:profileId/follow', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await creatorProfileService.follow(
        req.params.profileId,
        req.actorContext
      ));
    } catch (error) {
      return sendCreatorError(res, error);
    }
  });

  app.delete('/api/community/creators/:profileId/follow', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await creatorProfileService.unfollow(
        req.params.profileId,
        req.actorContext
      ));
    } catch (error) {
      return sendCreatorError(res, error);
    }
  });
}
