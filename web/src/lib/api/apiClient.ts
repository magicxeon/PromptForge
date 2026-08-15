import { z, type ZodType } from 'zod';
import { getActiveActorId } from '../auth/actorStore';
import { ApiError } from './apiError';
import { emitTelemetry } from '../telemetry/telemetry';

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

type ApiRequestOptions<TSchema extends ZodType | undefined> = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  schema?: TSchema;
};

export async function apiRequest<TSchema extends ZodType | undefined = undefined>(
  path: string,
  options: ApiRequestOptions<TSchema> = {}
): Promise<TSchema extends ZodType ? z.infer<TSchema> : unknown> {
  const headers = new Headers(options.headers);
  headers.set('x-mpf-user-id', getActiveActorId());

  let body = options.body;
  if (body && isJsonBody(body)) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body: body as BodyInit | null | undefined
  });

  if (!response.ok) {
    emitTelemetry('api_error', { path: path.split('?', 1)[0], status: response.status });
    throw await createApiError(response);
  }

  if (response.status === 204) {
    return undefined as TSchema extends ZodType ? z.infer<TSchema> : unknown;
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!options.schema) return payload as TSchema extends ZodType ? z.infer<TSchema> : unknown;
  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    emitTelemetry('contract_error', { path: path.split('?', 1)[0], issueCount: parsed.error.issues.length });
    throw parsed.error;
  }
  return parsed.data as TSchema extends ZodType ? z.infer<TSchema> : unknown;
}

export function apiMediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^(data:|blob:)/i.test(path)) return path;
  if (/^https?:\/\//i.test(path)) {
    try {
      const mediaUrl = new URL(path);
      const apiOrigin = new URL(apiBaseUrl || window.location.origin, window.location.origin).origin;
      return mediaUrl.origin === apiOrigin || mediaUrl.origin === window.location.origin
        ? mediaUrl.toString()
        : null;
    } catch {
      return null;
    }
  }
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiMediaBlob(path: string, signal?: AbortSignal) {
  const url = apiMediaUrl(path);
  if (!url) throw new Error('Media URL is unavailable.');
  const response = await fetch(url, {
    headers: { 'x-mpf-user-id': getActiveActorId() },
    signal
  });
  if (!response.ok) throw await createApiError(response);
  return response.blob();
}

async function createApiError(response: Response) {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // The stable status remains useful when a proxy returns non-JSON.
  }
  const record = isRecord(payload) ? payload : {};
  const nested = isRecord(record.error) ? record.error : {};
  const message = String(
    nested.message || record.message || record.error || response.statusText || 'Request failed.'
  );
  return new ApiError({
    status: response.status,
    code: String(nested.code || record.code || 'api_request_failed'),
    message,
    details: nested.details || record.details || null
  });
}

function isJsonBody(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === 'object'
    && value !== null
    && !(value instanceof FormData)
    && !(value instanceof Blob)
    && !(value instanceof URLSearchParams)
    && !(value instanceof ArrayBuffer);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
