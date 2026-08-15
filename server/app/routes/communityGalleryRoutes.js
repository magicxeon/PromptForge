function sendError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'community_gallery_failed',
      message: error.message || 'Community Gallery request failed.'
    }
  });
}

export function registerCommunityGalleryRoutes(app, {
  galleryService,
  communityFeaturePolicyService
}) {
  const assertEnabled = () =>
    communityFeaturePolicyService.assertEnabled('community.galleryEnabled');

  app.post('/api/community/gallery', async (req, res) => {
    try {
      await assertEnabled();
      return res.status(201).json(await galleryService.addGalleryItem(req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/creators/:handle/gallery', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await galleryService.listGalleryByHandle(
        req.params.handle, req.query, req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/community/gallery/:itemId/use-template', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await galleryService.createGalleryHandoff(req.params.itemId, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/community/characters', async (req, res) => {
    try {
      await assertEnabled();
      return res.status(201).json(await galleryService.createCharacter(req.body, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/creators/:handle/characters', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await galleryService.listCharactersByHandle(
        req.params.handle, req.query, req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/community/characters/:itemId/use-character', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await galleryService.createCharacterHandoff(req.params.itemId, req.actorContext));
    } catch (error) {
      return sendError(res, error);
    }
  });

  for (const resource of ['gallery', 'characters']) {
    app.get(`/api/community/${resource}/:itemId/:mediaKind(image|thumbnail)`, async (req, res) => {
      try {
        await assertEnabled();
        const filePath = resource === 'gallery'
          ? await galleryService.getGalleryMediaFile(req.params.itemId, req.params.mediaKind, req.actorContext)
          : await galleryService.getCharacterMediaFile(req.params.itemId, req.params.mediaKind, req.actorContext);
        return res.sendFile(filePath);
      } catch (error) {
        return sendError(res, error);
      }
    });
  }
}
