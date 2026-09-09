export function registerMediaExportRoutes(app, { mediaExportService }) {
  app.post('/api/media/exports', async (req, res) => {
    const controller = new AbortController();
    const close = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', close);
    try {
      const result = await mediaExportService.export(req.body, req.actorContext, controller.signal);
      if (controller.signal.aborted) return;
      res.set({ 'Content-Type': result.mimeType || 'image/png', 'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
        'Access-Control-Expose-Headers': 'X-Momelo-Export, Content-Disposition' });
      if (result.layoutVersion) res.set('X-Momelo-Export', JSON.stringify({ width: result.width, height: result.height,
        presetId: result.presetId, warnings: result.warnings, count: result.count, filename: result.filename,
        mimeType: result.mimeType, layoutVersion: result.layoutVersion }));
      res.send(result.bytes);
    } catch (error) {
      if (controller.signal.aborted) return;
      res.status(error.statusCode || 500).json({ error: { code: error.code || 'export_failed', message: 'The requested export could not be completed.' } });
    } finally { res.off('close', close); }
  });
}
