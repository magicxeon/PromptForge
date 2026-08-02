import { imagePresentationService as defaultImagePresentationService } from '../../domain/assets/ImagePresentationService.js';

function sendSceneTemplateError(
  res,
  error,
  fallbackCode = 'scene_template_request_failed',
  fallbackStatus = 400
) {
  return res.status(error.statusCode || fallbackStatus).json({
    error: {
      code: error.code || fallbackCode,
      message: error.code && error.message
        ? error.message
        : 'Scene template request failed.'
    }
  });
}

export function registerSceneTemplateRoutes(app, {
  communityShareService,
  communityFeaturePolicyService,
  imagePresentationService = defaultImagePresentationService,
  templatePoseProxyService = null
}) {
  app.post('/api/scene-templates/share-drafts', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      const { sourceGenerationId } = req.body || {};
      const draft = await communityShareService.createGeneratedShareDraft(sourceGenerationId, req.actorContext);
      res.json(draft);
    } catch (err) {
      sendSceneTemplateError(res, err, 'scene_template_share_draft_failed');
    }
  });

  app.post('/api/scene-templates/share-drafts/:draftId/publish', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      const {
        title,
        description,
        promptVisibility,
        visibility,
        officialTags,
        customTags,
        publishAsTemplate,
        templateAccessCredits,
        creatorShareBps,
        publicInputSchema,
        templateKind,
        compatibility
      } = req.body || {};
      const post = await communityShareService.publishGeneratedImageShare(
        req.params.draftId,
        {
          title,
          description,
          promptVisibility,
          visibility,
          officialTags,
          customTags,
          publishAsTemplate,
          templateAccessCredits,
          creatorShareBps,
          publicInputSchema,
          templateKind,
          compatibility
        },
        req.actorContext
      );
      res.json(post);
    } catch (err) {
      sendSceneTemplateError(res, err, 'scene_template_publish_failed');
    }
  });

  app.get('/api/scene-templates/shared', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      const page = await communityShareService.listSharedPosts(req.query, req.actorContext);
      res.json(page.items);
    } catch (err) {
      sendSceneTemplateError(res, err, 'scene_template_list_failed', 500);
    }
  });

  app.get('/api/scene-templates/shared/:postId', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      return res.json(await communityShareService.getSharedPost(req.params.postId, req.actorContext));
    } catch (err) {
      return sendSceneTemplateError(res, err, 'scene_template_read_failed', 500);
    }
  });

  app.get('/api/scene-templates/shared/:postId/presentations/:profileId', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      const filePath = await communityShareService.getSharedPostMediaFile(
        req.params.postId,
        'thumbnail',
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
    } catch (err) {
      return sendSceneTemplateError(
        res,
        err,
        'scene_template_presentation_unavailable',
        404
      );
    }
  });

  app.get('/api/scene-templates/shared/:postId/:mediaKind(image|thumbnail)', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      const filePath = await communityShareService.getSharedPostMediaFile(
        req.params.postId,
        req.params.mediaKind,
        req.actorContext
      );
      return res.sendFile(filePath, error => {
        if (!error) return;
        if (!res.headersSent) {
          sendSceneTemplateError(
            res,
            error,
            'scene_template_media_unavailable',
            404
          );
        }
      });
    } catch (err) {
      return sendSceneTemplateError(res, err, 'scene_template_media_unavailable', 404);
    }
  });

  app.patch('/api/scene-templates/shared/:postId', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      return res.json(await communityShareService.updateSharedPostPresentation(
        req.params.postId,
        req.body || {},
        req.actorContext
      ));
    } catch (err) {
      return sendSceneTemplateError(res, err, 'scene_template_update_failed');
    }
  });

  app.post('/api/scene-templates/shared/:postId/moderate', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.moderationEnabled');
      return res.json(await communityShareService.moderateSharedPost(
        req.params.postId,
        req.body || {},
        req.actorContext
      ));
    } catch (err) {
      return sendSceneTemplateError(res, err, 'scene_template_moderation_failed');
    }
  });

  app.patch('/api/scene-templates/shared/:postId/taxonomy', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.moderationEnabled');
      return res.json(await communityShareService.updateSharedPostTaxonomy(
        req.params.postId,
        req.body || {},
        req.actorContext
      ));
    } catch (err) {
      return sendSceneTemplateError(res, err, 'community_taxonomy_update_failed');
    }
  });

  app.post('/api/scene-templates/shared/:postId/use-template', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      const handoff = await communityShareService.getTemplateForViewer(
        req.params.postId,
        req.actorContext
      );
      const poseProxyReadiness = templatePoseProxyService && handoff.id
        ? await templatePoseProxyService.getReadiness(
          handoff.id,
          handoff.currentVersionId || null
        )
        : null;
      return res.json({ ...handoff, poseProxyReadiness });
    } catch (err) {
      return sendSceneTemplateError(res, err, 'scene_template_use_failed', 500);
    }
  });

  app.post('/api/scene-templates/remix-events', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      const { templateId, sourcePostId, generatedJobId, replacementSummary } = req.body || {};
      const event = await communityShareService.recordRemix({
        templateId,
        sourcePostId,
        generatedJobId,
        replacementSummary
      }, req.actorContext);
      res.json(event);
    } catch (err) {
      sendSceneTemplateError(res, err, 'scene_template_remix_event_failed');
    }
  });
}
