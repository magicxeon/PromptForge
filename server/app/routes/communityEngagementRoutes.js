function sendEngagementError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'community_engagement_failed',
      message: error.message || 'Community engagement request failed.'
    }
  });
}

export function registerCommunityEngagementRoutes(app, {
  engagementService,
  rankingService,
  moderationService,
  communityFeaturePolicyService
}) {
  const assertEnabled = () =>
    communityFeaturePolicyService.assertEnabled('community.engagementEnabled');

  app.get('/api/community/posts', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await rankingService.listRankedPosts({
        sort: req.query.sort,
        period: req.query.period,
        officialTag: req.query.officialTag,
        limit: req.query.limit
      }));
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });

  app.get('/api/community/posts/:postId/engagement', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await engagementService.getEngagement(req.params.postId, req.actorContext));
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });

  app.post('/api/community/posts/:postId/views', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await engagementService.recordView(
        req.params.postId,
        req.actorContext,
        { requestId: req.requestId }
      ));
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });

  for (const reactionType of ['like', 'save']) {
    app.put(`/api/community/posts/:postId/reactions/${reactionType}`, async (req, res) => {
      try {
        await assertEnabled();
        return res.json(await engagementService.setReaction(
          req.params.postId,
          reactionType,
          true,
          req.actorContext,
          { requestId: req.requestId }
        ));
      } catch (error) {
        return sendEngagementError(res, error);
      }
    });

    app.delete(`/api/community/posts/:postId/reactions/${reactionType}`, async (req, res) => {
      try {
        await assertEnabled();
        return res.json(await engagementService.setReaction(
          req.params.postId,
          reactionType,
          false,
          req.actorContext,
          { requestId: req.requestId }
        ));
      } catch (error) {
        return sendEngagementError(res, error);
      }
    });
  }

  app.get('/api/community/posts/:postId/comments', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await engagementService.listComments(
        req.params.postId,
        req.query || {},
        req.actorContext
      ));
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });

  app.post('/api/community/posts/:postId/comments', async (req, res) => {
    try {
      await assertEnabled();
      const result = await engagementService.createComment(
        req.params.postId,
        req.body?.body,
        req.actorContext,
        { requestId: req.requestId }
      );
      return res.status(201).json(result);
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });

  app.delete('/api/community/posts/:postId/comments/:commentId', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await engagementService.removeComment(
        req.params.postId,
        req.params.commentId,
        req.actorContext,
        { requestId: req.requestId }
      ));
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });

  app.post('/api/community/posts/:postId/comments/:commentId/report', async (req, res) => {
    try {
      await assertEnabled();
      await communityFeaturePolicyService.assertEnabled('community.moderationEnabled');
      const result = await moderationService.reportComment({
        postId: req.params.postId,
        commentId: req.params.commentId,
        reason: req.body?.reason,
        details: req.body?.details
      }, req.actorContext);
      return res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });

  app.put('/api/community/posts/:postId/comparison-vote', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await engagementService.setComparisonVote(
        req.params.postId,
        req.body?.comparisonSlotId,
        req.actorContext,
        { requestId: req.requestId }
      ));
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });

  app.delete('/api/community/posts/:postId/comparison-vote', async (req, res) => {
    try {
      await assertEnabled();
      return res.json(await engagementService.removeComparisonVote(
        req.params.postId,
        req.actorContext,
        { requestId: req.requestId }
      ));
    } catch (error) {
      return sendEngagementError(res, error);
    }
  });
}
