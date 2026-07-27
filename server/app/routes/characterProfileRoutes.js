import fs from 'fs/promises';

function sendError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'character_profile_request_failed',
      message: error.message || 'Character Profile request failed.'
    }
  });
}

export function registerCharacterProfileRoutes(app, {
  profileService,
  castingExportService,
  sharingService,
  communityFeaturePolicyService
}) {
  const assertCommunityEnabled = () =>
    communityFeaturePolicyService.assertEnabled('community.galleryEnabled');
  const assertCharacterProfilesEnabled = () =>
    communityFeaturePolicyService.assertEnabled('community.characterProfilesEnabled');
  const profileGate = async (req, res, next) => {
    try {
      await assertCharacterProfilesEnabled();
      next();
    } catch (error) {
      sendError(res, error);
    }
  };
  app.use('/api/character-profiles', profileGate);
  app.use('/api/admin/character-profiles', profileGate);
  app.use('/api/community/character-profiles', profileGate);
  app.post('/api/character-profiles', async (req, res) => {
    try {
      return res.status(201).json(await profileService.create(req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/character-profiles', async (req, res) => {
    try {
      return res.json(await profileService.listOwn(req.query, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/character-profiles/:id', async (req, res) => {
    try {
      return res.json(await profileService.getOwnerDetail(req.params.id, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.patch('/api/character-profiles/:id', async (req, res) => {
    try {
      return res.json(await profileService.updateMetadata(req.params.id, req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/archive', async (req, res) => {
    try {
      return res.json(await profileService.archive(req.params.id, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/admin/character-profiles/:id/moderation', async (req, res) => {
    try {
      return res.json(await profileService.moderate(
        req.params.id,
        req.body,
        req.actorContext,
        { requestId: req.requestId }
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/character-profiles/:id/versions', async (req, res) => {
    try {
      const detail = await profileService.getOwnerDetail(req.params.id, req.actorContext);
      return res.json({ items: detail.versions });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/versions', async (req, res) => {
    try {
      return res.status(201).json(await profileService.createIdentityVersion(
        req.params.id,
        req.body,
        req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/casting-export-plan', async (req, res) => {
    try {
      return res.json(await castingExportService.createPlan(req.params.id, req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/approve', async (req, res) => {
    try {
      const detail = await profileService.getOwnerDetail(req.params.id, req.actorContext);
      const approved = detail.characterType === 'styled_character'
        ? await profileService.approveStyled(req.params.id, req.body, req.actorContext)
        : await castingExportService.approve(req.params.id, req.body, req.actorContext);
      await sharingService.syncProjection(approved.profile, req.actorContext);
      return res.json(approved);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/convert-to-reusable', async (req, res) => {
    try {
      return res.json(await profileService.convertToReusableModel(req.params.id, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/sharing', async (req, res) => {
    try {
      return res.json(await sharingService.updateSharing(req.params.id, req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/character-profiles/:id/stats', async (req, res) => {
    try {
      const detail = await profileService.getOwnerDetail(req.params.id, req.actorContext);
      return res.json(detail.stats);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/characters', async (req, res) => {
    try {
      await assertCommunityEnabled();
      await assertCharacterProfilesEnabled();
      return res.json(await sharingService.listPublic(req.query, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/characters/:id', async (req, res) => {
    try {
      await assertCommunityEnabled();
      await assertCharacterProfilesEnabled();
      return res.json(await sharingService.getPublicDetail(req.params.id, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/characters/:id/works', async (req, res) => {
    try {
      await assertCommunityEnabled();
      await assertCharacterProfilesEnabled();
      return res.json(await sharingService.listPublicWorks(req.params.id, req.query, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/characters/:id/stats', async (req, res) => {
    try {
      await assertCommunityEnabled();
      await assertCharacterProfilesEnabled();
      const detail = await sharingService.getPublicDetail(req.params.id, req.actorContext);
      return res.json(detail.stats);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/community/characters/:id/handoffs', async (req, res) => {
    try {
      await assertCommunityEnabled();
      await assertCharacterProfilesEnabled();
      return res.json(await sharingService.createHandoff(req.params.id, req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/character-profiles/:id/image', async (req, res) => {
    try {
      await assertCommunityEnabled();
      const filePath = await sharingService.getMediaFile(req.params.id, req.actorContext, 'image');
      await fs.access(filePath);
      return res.sendFile(filePath);
    } catch (error) {
      return sendError(res, error);
    }
  });

  for (const mediaKind of ['thumbnail', 'face']) {
    app.get(`/api/community/character-profiles/:id/${mediaKind}`, async (req, res) => {
      try {
        await assertCommunityEnabled();
        const filePath = await sharingService.getMediaFile(req.params.id, req.actorContext, mediaKind);
        await fs.access(filePath);
        return res.sendFile(filePath);
      } catch (error) {
        return sendError(res, error);
      }
    });
  }
}
