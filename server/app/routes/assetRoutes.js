import { pipeline } from 'node:stream/promises';

const contentTypes = Object.freeze({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' });

function rangeFor(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || !size) return false;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size
    && (!(!match[1] && Number(match[2]) === 0)) ? { start, end } : false;
}

export function registerAssetRoutes(app, { assetDeliveryService }) {
  app.use('/outputs', async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
    let file;
    try {
      // originalUrl retains percent/backslash attempts hidden by router decoding.
      const outputUrl = req.originalUrl.split('?')[0];
      file = await assetDeliveryService.openOwnedOutput({ outputUrl, actor: req.actorContext,
        reauthorize: req.reauthorizeIdentity });
      const { handle, stat, extension } = file;
      const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
      const modified = stat.mtime.toUTCString();
      res.setHeader('ETag', etag); res.setHeader('Last-Modified', modified);
      res.setHeader('Content-Type', contentTypes[extension] || 'application/octet-stream');
      res.setHeader('Accept-Ranges', 'bytes');
      const noneMatch = req.headers['if-none-match'];
      const since = req.headers['if-modified-since'];
      if ((noneMatch && (noneMatch === '*' || noneMatch.split(',').map(value => value.trim()).includes(etag)))
        || (!noneMatch && since && Number.isFinite(Date.parse(since))
          && Math.floor(stat.mtimeMs / 1000) <= Date.parse(since) / 1000)) {
        await handle.close(); return res.status(304).end();
      }
      const ifRange = req.headers['if-range'];
      const allowRange = !ifRange || (!ifRange.startsWith('W/') && ifRange === etag)
        || (Number.isFinite(Date.parse(ifRange)) && Math.floor(stat.mtimeMs / 1000) <= Date.parse(ifRange) / 1000);
      const range = rangeFor(allowRange ? req.headers.range : null, stat.size);
      if (range === false) { res.setHeader('Content-Range', `bytes */${stat.size}`);
        await handle.close(); return res.status(416).end(); }
      if (range) { res.status(206); res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`); }
      res.setHeader('Content-Length', range ? range.end - range.start + 1 : stat.size);
      if (req.method === 'HEAD' || stat.size === 0) { await handle.close(); return res.end(); }
      const stream = handle.createReadStream({ ...(range || {}), autoClose: true, highWaterMark: 64 * 1024 });
      // Backpressure bounds retained output to the file stream's 64KiB chunks.
      // Revocation closes transport; it never changes accepted Generation work.
      await pipeline(stream, async function* (chunks) {
        for await (const chunk of chunks) {
          await file.reauthorize();
          yield chunk;
        }
      }, res);
    } catch (error) {
      await file?.handle.close().catch(() => {});
      if (res.headersSent) return res.destroy();
      const expired = error.code === 'auth_session_expired';
      const missing = error.code === 'output_unavailable';
      return res.status(expired ? 401 : missing ? 404 : 503).type('application/json').end(JSON.stringify({ error: 'Output unavailable.',
        code: expired ? 'auth_session_expired' : missing ? 'output_unavailable' : 'auth_service_unavailable',
        requestId: req.requestId ?? null }));
    }
  });
}
