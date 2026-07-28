function sendError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'face_reference_handoff_failed',
      message: error.message || 'The Face reference handoff could not be created.'
    }
  });
}

export function registerReferenceHandoffRoutes(app, { faceReferenceHandoffService }) {
  app.post('/api/reference-handoffs/face', async (req, res) => {
    try {
      return res.json(await faceReferenceHandoffService.create(
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });
}
