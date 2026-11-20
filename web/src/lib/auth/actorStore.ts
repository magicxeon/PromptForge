import type { AuthMode } from './actorSchemas';

// ActorProvider is the sole writer. Cookies remain HttpOnly; neither actor IDs
// from storage nor this presentation state authenticate a server request.
let identity = { epoch: 0, ready: false, actorId: '', authMode: 'session' as AuthMode, csrfToken: '' };
const requests = new Set<AbortController>();
let revalidation: { token: symbol; promise: Promise<void>; release: () => void } | null = null;

// Suspend private transport, not completed presentation, while a returning tab
// confirms its session. Hard invalidation changes the epoch before release.
export function beginIdentityRevalidation() {
  const token = Symbol('identity-revalidation');
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  revalidation?.release();
  revalidation = { token, promise, release };
  return token;
}

export function finishIdentityRevalidation(token: symbol) {
  if (revalidation?.token !== token) return;
  revalidation.release();
  revalidation = null;
}

export async function waitForIdentityRevalidation(signal?: AbortSignal | null) {
  const epoch = identity.epoch;
  while (revalidation) {
    const pending = revalidation.promise;
    await new Promise<void>((resolve, reject) => {
      const abort = () => { cleanup(); reject(new DOMException('Request cancelled.', 'AbortError')); };
      const cleanup = () => signal?.removeEventListener('abort', abort);
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      void pending.then(() => { cleanup(); resolve(); });
    });
    assertIdentityEpoch(epoch);
  }
}

export function getActiveActorId() { return identity.ready ? identity.actorId : ''; }
export function getIdentitySnapshot() { return { ...identity }; }
export function getActorScope(actorId: string) { return `${identity.authMode}:${actorId}`; }

export function beginIdentityResolution() {
  identity = { ...identity, epoch: identity.epoch + 1, ready: false, csrfToken: '' };
  if (revalidation) finishIdentityRevalidation(revalidation.token);
  for (const controller of requests) controller.abort();
  return identity.epoch;
}

export function publishIdentity(epoch: number, input: { actorId: string; authMode: AuthMode; csrfToken: string }) {
  if (epoch !== identity.epoch) return false;
  identity = { epoch, ready: true, ...input };
  return true;
}

export function trackIdentityRequest(controller: AbortController) {
  requests.add(controller);
  return () => requests.delete(controller);
}

export function assertIdentityEpoch(epoch: number) {
  if (identity.epoch !== epoch) throw new DOMException('Identity changed.', 'AbortError');
}

export function notifyIdentityInvalidated() {
  beginIdentityResolution();
  window.dispatchEvent(new Event('mpf:identity-invalidated'));
}

// Retained export for old fixture callers. Runtime actor switching is disabled;
// storage is never consumed by ActorProvider or any transport.
export function persistActiveActorId(actorId: string) {
  localStorage.setItem('mpf_active_mock_user_id', actorId);
}
