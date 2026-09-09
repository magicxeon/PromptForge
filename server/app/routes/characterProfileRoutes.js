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
  lookService,
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

  app.delete('/api/character-profiles/:id', async (req, res) => {
    try {
      return res.json(await profileService.deleteOwned(
        req.params.id, req.body, req.actorContext, { requestId: req.requestId }
      ));
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

  app.get('/api/character-profiles/:id/looks', async (req, res) => {
    try {
      return res.json(await lookService.list(req.params.id, req.query, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/looks/import-generated', async (req, res) => {
    try {
      return res.status(201).json(await lookService.importGeneratedSheet(req.params.id, req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/looks', async (req, res) => {
    try {
      return res.status(201).json(await lookService.createDraft(req.params.id, req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/character-profiles/:id/looks/:lookId/versions/:versionId/generation-plan', async (req, res) => {
    try {
      return res.json(await lookService.getGenerationPlan(
        req.params.id, req.params.lookId, req.params.versionId, req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/looks/:lookId/versions/:versionId/generated-review', async (req, res) => {
    try {
      return res.json(await lookService.attachGeneratedReview(
        req.params.id, req.params.lookId, req.params.versionId, req.body, req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/looks/:lookId/versions/:versionId/review', async (req, res) => {
    try {
      return res.json(await lookService.attachReview(
        req.params.id, req.params.lookId, req.params.versionId, req.body, req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/looks/:lookId/versions/:versionId/approve', async (req, res) => {
    try {
      return res.json(await lookService.approve(
        req.params.id, req.params.lookId, req.params.versionId, req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/character-profiles/:id/looks/:lookId/versions/:versionId/media/sheet', async (req, res) => {
    try {
      const filePath = await lookService.getReviewMediaFile(
        req.params.id, req.params.lookId, req.params.versionId, req.actorContext
      );
      res.set('Cache-Control', 'private, no-store');
      return res.sendFile(filePath);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/character-profiles/:id/looks/:lookId/retire', async (req, res) => {
    try {
      return res.json(await lookService.retire(req.params.id, req.params.lookId, req.actorContext));
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

  app.patch('/api/character-profiles/:id/featured-image', async (req, res) => {
    try {
      return res.json(await sharingService.updateFeaturedImage(
        req.params.id,
        req.body,
        req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/character-profiles/:id/featured-image-candidates', async (req, res) => {
    try {
      return res.json(await sharingService.listFeaturedImageCandidates(
        req.params.id,
        req.query,
        req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/character-profiles/:id/featured-image-candidates/:sourceType/:sourceId/media', async (req, res) => {
    try {
      const filePath = await sharingService.getFeaturedCandidateMediaFile(
        req.params.id,
        req.params.sourceType,
        req.params.sourceId,
        req.actorContext
      );
      res.set('Cache-Control', 'private, no-store');
      return res.sendFile(filePath);
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

  for (const mediaKind of ['image', 'thumbnail', 'face', 'sheet']) {
    app.get(`/api/character-profiles/:id/media/${mediaKind}`, async (req, res) => {
      try {
        const filePath = await sharingService.getMediaFile(
          req.params.id,
          req.actorContext,
          mediaKind
        );
        res.set('Cache-Control', 'private, no-store');
        return res.sendFile(filePath);
      } catch (error) {
        return sendError(res, error);
      }
    });
  }

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
      res.set('Cache-Control', 'private, max-age=60');
      return res.sendFile(filePath);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/character-profiles/:id/featured-image', async (req, res) => {
    try {
      await assertCommunityEnabled();
      const filePath = await sharingService.getFeaturedImageFile(req.params.id, req.actorContext);
      res.set('Cache-Control', 'private, no-store');
      return res.sendFile(filePath);
    } catch (error) {
      return sendError(res, error);
    }
  });

  for (const mediaKind of ['thumbnail', 'face', 'sheet']) {
    app.get(`/api/community/character-profiles/:id/${mediaKind}`, async (req, res) => {
      try {
        await assertCommunityEnabled();
        const filePath = await sharingService.getMediaFile(req.params.id, req.actorContext, mediaKind);
        res.set('Cache-Control', 'private, max-age=60');
        return res.sendFile(filePath);
      } catch (error) {
        return sendError(res, error);
      }
    });
  }
}
