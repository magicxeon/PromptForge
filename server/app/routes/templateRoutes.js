function sendTemplateError(res, error, fallbackCode = 'template_request_failed') {
  return res.status(error.statusCode || 500).json({
    error: {
      code: error.code || fallbackCode,
      message: error.message || 'Template request failed.'
    }
  });
}

export function registerTemplateRoutes(app, { templateCoreService }) {
  app.get('/api/templates', async (req, res) => {
    try {
      const items = await templateCoreService.listPublished({
        kind: req.query.kind || null,
        limit: req.query.limit
      });
      return res.json({ items });
    } catch (error) {
      return sendTemplateError(res, error, 'template_list_failed');
    }
  });

  app.get('/api/templates/:templateId', async (req, res) => {
    try {
      const { template, version } = await templateCoreService.getPublicTemplate(req.params.templateId);
      return res.json(templateCoreService.toPublicTemplate(template, version));
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
}
