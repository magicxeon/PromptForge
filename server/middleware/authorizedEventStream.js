// Transport only: accepted work and settlement remain with their owners.
// Each queued frame has one fresh Identity decision; nothing is cached.
export async function createAuthorizedEventStream(req, res, {
  maxBytes = 1024 * 1024, maxFrames = 32, drainTimeoutMs = 5000
} = {}) {
  if (typeof req.reauthorizeIdentity !== 'function')
    throw Object.assign(new Error('Authentication required.'), { code: 'auth_session_expired', statusCode: 401 });
  try { await req.reauthorizeIdentity(); }
  catch (error) { throw Object.assign(new Error('Authentication unavailable.'), {
    code: error?.code === 'auth_session_expired' ? 'auth_session_expired' : 'auth_service_unavailable',
    statusCode: error?.code === 'auth_session_expired' ? 401 : 503
  }); }
  if (req.aborted || res.destroyed || res.writableEnded)
    throw Object.assign(new Error('Authentication unavailable.'), { code: 'auth_session_expired', statusCode: 401 });
  let closed = false, ending = false, pumping = false, queuedBytes = 0;
  const frames = [], listeners = new Set();
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const cleanup = () => {
    if (closed) return;
    closed = true; frames.length = 0; queuedBytes = 0;
    req.removeListener?.('aborted', cleanup); res.removeListener?.('close', cleanup);
    for (const listener of listeners) { try { listener(); } catch {} }
    listeners.clear(); finish();
  };
  const close = () => { cleanup(); if (!res.destroyed && !res.writableEnded) res.destroy(); };
  req.on?.('aborted', cleanup); res.on?.('close', cleanup);
  const waitForDrain = () => new Promise((resolve, reject) => {
    const done = error => {
      clearTimeout(timer); res.removeListener('drain', drained);
      res.removeListener('close', stopped); res.removeListener('error', stopped);
      error ? reject(error) : resolve();
    };
    const drained = () => done(), stopped = () => done(new Error('Stream unavailable.'));
    const timer = setTimeout(stopped, drainTimeoutMs); timer.unref?.();
    res.once('drain', drained); res.once('close', stopped); res.once('error', stopped);
  });
  const pump = async () => {
    if (pumping || closed) return;
    pumping = true;
    try {
      while (frames.length && !closed) {
        const frame = frames.shift(); queuedBytes -= frame.length;
        await req.reauthorizeIdentity();
        if (closed) return;
        if (res.destroyed || res.writableEnded) { close(); return; }
        if (!res.write(frame)) await waitForDrain();
        res.flush?.();
      }
      if (!closed && ending && !frames.length) { res.end(); cleanup(); }
    } catch { close(); }
    finally { pumping = false; }
  };
  const write = (chunk, encoding) => {
    if (closed || ending) return false;
    const frame = typeof chunk === 'string' ? Buffer.from(chunk, encoding || 'utf8') : Buffer.from(chunk);
    if (frames.length >= maxFrames || frame.length > maxBytes || queuedBytes + frame.length > maxBytes) {
      close(); return false;
    }
    frames.push(frame); queuedBytes += frame.length;
    void pump(); return !closed;
  };
  const end = (chunk, encoding) => {
    if (chunk !== undefined && chunk !== null) write(chunk, encoding);
    ending = true; void pump(); return response;
  };
  const response = new Proxy(res, { get(target, key) {
    if (key === 'write') return write;
    if (key === 'end') return end;
    if (key === 'destroy') return close;
    if (key === 'writableEnded') return closed || ending || target.writableEnded;
    if (key === 'flush') return () => {};
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  return Object.freeze({ response, finished, close, onClose(listener) {
    if (closed) listener(); else listeners.add(listener);
  } });
}
