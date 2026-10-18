// Launcher defaults do not enable bypass; the canonical Auth policy still
// validates the explicit toggle, loopback deployment and isolated fixture.
export function developmentApiEnvironment(processEnv, fileEnv = {}) {
  return { ...processEnv, NODE_ENV: processEnv.NODE_ENV ?? fileEnv.NODE_ENV ?? 'development' };
}

export async function developmentApiReady(fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl('http://127.0.0.1:6500/api/health', {
      signal: AbortSignal.timeout(1000), redirect: 'error'
    });
    if (response.status !== 200) return false;
    return (await response.json())?.status === 'ok';
  } catch {
    return false;
  }
}
