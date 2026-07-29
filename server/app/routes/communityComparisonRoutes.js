export function registerCommunityComparisonRoutes(app, {
  comparisonShareService,
  postAccessService,
  communityFeaturePolicyService,
  imagePresentationService
}) {
  app.post('/api/community/comparisons/:setId/publish', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      return res.status(201).json(await comparisonShareService.publish(
        req.params.setId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/posts/:postId/comparison-slots/:slotId/image', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.exploreEnabled');
      const filePath = await postAccessService.getComparisonSlotMediaFile(
        req.params.postId,
        req.params.slotId,
        req.actorContext
      );
      return res.sendFile(filePath);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get(
    '/api/community/posts/:postId/comparison-slots/:slotId/presentations/:profileId',
    async (req, res) => {
      try {
        await communityFeaturePolicyService.assertEnabled('community.exploreEnabled');
        const filePath = await postAccessService.getComparisonSlotMediaFile(
          req.params.postId,
          req.params.slotId,
          req.actorContext
        );
        const presentation = await imagePresentationService.renderFile(
          filePath,
          req.params.profileId
        );
        if (req.headers?.['if-none-match'] === presentation.etag) {
          return res.status(304).end();
        }
        res.setHeader('Content-Type', presentation.contentType);
        res.setHeader('Content-Length', String(presentation.contentLength));
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('ETag', presentation.etag);
        return res.send(presentation.buffer);
      } catch (error) {
        return sendError(res, error);
      }
    }
  );
}

function sendError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'community_comparison_failed',
      message: error.message || 'Community comparison request failed.'
    }
  });
}
