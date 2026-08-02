function sendTemplateError(res, error, fallbackCode = 'template_request_failed') {
  return res.status(error.statusCode || 500).json({
    error: {
      code: error.code || fallbackCode,
      message: error.message || 'Template request failed.'
    }
  });
}

export function registerTemplateRoutes(app, { templateCoreService, templatePoseProxyService }) {
  app.get('/api/templates', async (req, res) => {
    try {
      const items = await templateCoreService.listPublished({
        kind: req.query.kind || null,
        limit: req.query.limit
      });
      return res.json({
        items: await Promise.all(items.map(async item => ({
          ...item,
          poseProxyReadiness: await templatePoseProxyService.getReadiness(
            item.id,
            item.currentVersionId
          )
        })))
      });
    } catch (error) {
      return sendTemplateError(res, error, 'template_list_failed');
    }
  });

  app.get('/api/templates/:templateId', async (req, res) => {
    try {
      const { template, version } = await templateCoreService.getPublicTemplate(req.params.templateId);
      return res.json({
        ...templateCoreService.toPublicTemplate(template, version),
        poseProxyReadiness: await templatePoseProxyService.getReadiness(template.id, version.id)
      });
    } catch (error) {
      return sendTemplateError(res, error, 'template_read_failed');
    }
  });

  app.post('/api/templates/:templateId/use-sessions', async (req, res) => {
    try {
      const result = await templateCoreService.createUseSession({
        templateId: req.params.templateId,
        templateVersionId: req.body?.templateVersionId,
        sourceCommunityPostId: req.body?.sourceCommunityPostId
      }, req.actorContext);
      return res.status(201).json(result);
    } catch (error) {
      return sendTemplateError(res, error, 'template_use_session_failed');
    }
  });

  app.post('/api/templates/:templateId/archive', async (req, res) => {
    try {
      const template = await templateCoreService.archiveTemplate(
        req.params.templateId,
        req.actorContext
      );
      return res.json({ template });
    } catch (error) {
      return sendTemplateError(res, error, 'template_archive_failed');
    }
  });

  app.get('/api/templates/:templateId/pose-proxy', async (req, res) => {
    try {
      return res.json(await templatePoseProxyService.getOwnerReadiness(
        req.params.templateId,
        req.query.templateVersionId || null,
        req.actorContext
      ));
    } catch (error) {
      return sendTemplateError(res, error, 'template_pose_proxy_read_failed');
    }
  });

  app.post('/api/templates/:templateId/pose-proxy/estimate', async (req, res) => {
    try {
      return res.json(await templatePoseProxyService.estimate({
        templateId: req.params.templateId,
        templateVersionId: req.body?.templateVersionId,
        poseVariantId: req.body?.poseVariantId
      }, req.actorContext));
    } catch (error) {
      return sendTemplateError(res, error, 'template_pose_proxy_estimate_failed');
    }
  });

  app.post('/api/templates/:templateId/pose-proxy/prepare', async (req, res) => {
    try {
      return res.status(202).json(await templatePoseProxyService.prepare({
        templateId: req.params.templateId,
        templateVersionId: req.body?.templateVersionId,
        poseVariantId: req.body?.poseVariantId,
        estimateId: req.body?.estimateId,
        idempotencyKey: req.body?.idempotencyKey
      }, req.actorContext));
    } catch (error) {
      return sendTemplateError(res, error, 'template_pose_proxy_prepare_failed');
    }
  });

  app.post('/api/templates/:templateId/pose-proxy/:proxyId/review', async (req, res) => {
    try {
      return res.json(await templatePoseProxyService.review({
        templateId: req.params.templateId,
        proxyId: req.params.proxyId,
        decision: req.body?.decision,
        reasonCodes: req.body?.reasonCodes
      }, req.actorContext));
    } catch (error) {
      return sendTemplateError(res, error, 'template_pose_proxy_review_failed');
    }
  });
}
