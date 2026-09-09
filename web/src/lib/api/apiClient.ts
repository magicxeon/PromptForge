import { z, type ZodType } from 'zod';
import { getActiveActorId } from '../auth/actorStore';
import { ApiError } from './apiError';
import { emitTelemetry } from '../telemetry/telemetry';

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

type ApiRequestOptions<TSchema extends ZodType | undefined> = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  schema?: TSchema;
  responseType?: 'blob';
  onResponseHeaders?: (headers: Headers) => void;
};

type ApiProgressRequestOptions<TResultSchema extends ZodType, TProgressSchema extends ZodType>
  = Omit<RequestInit, 'body'> & {
    body?: BodyInit | Record<string, unknown> | unknown[] | null;
    schema: TResultSchema;
    progressSchema: TProgressSchema;
    onProgress: (progress: z.infer<TProgressSchema>) => void;
  };

const MAX_STREAM_EVENT_CHARACTERS = 2_000_000;

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

  options.onResponseHeaders?.(response.headers);

  const contentType = response.headers.get('content-type') || '';
  const payload = options.responseType === 'blob' && /^image\/(png|jpeg)(;|$)/i.test(contentType)
    ? await response.blob()
    : contentType.includes('application/json')
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

export async function apiRequestWithProgress<
  TResultSchema extends ZodType,
  TProgressSchema extends ZodType
>(
  path: string,
  options: ApiProgressRequestOptions<TResultSchema, TProgressSchema>
): Promise<z.infer<TResultSchema>> {
  const {
    body: inputBody,
    schema,
    progressSchema,
    onProgress,
    ...requestInit
  } = options;
  const headers = new Headers(requestInit.headers);
  headers.set('x-mpf-user-id', getActiveActorId());
  headers.set('accept', 'text/event-stream');

  let body = inputBody;
  if (body && isJsonBody(body)) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...requestInit,
    headers,
    body: body as BodyInit | null | undefined
  });
  if (!response.ok) {
    emitTelemetry('api_error', { path: path.split('?', 1)[0], status: response.status });
    throw await createApiError(response);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    return parseStreamContract(schema, payload, path, 'result');
  }
  if (!response.body) {
    throw new ApiError({
      status: 502,
      code: 'api_progress_stream_missing',
      message: 'The server returned no progress stream.'
    });
  }

  let result: z.infer<TResultSchema> | undefined;
  let resultReceived = false;
  await consumeEventStream(response.body, (event, payload) => {
    if (event === 'progress') {
      onProgress(parseStreamContract(progressSchema, payload, path, 'progress'));
      return;
    }
    if (event === 'result') {
      result = parseStreamContract(schema, payload, path, 'result');
      resultReceived = true;
      return;
    }
    if (event === 'error') throw apiErrorFromStream(payload);
  });
  if (!resultReceived) {
    throw new ApiError({
      status: 502,
      code: 'api_progress_result_missing',
      message: 'The progress stream ended before returning a result.'
    });
  }
  return result as z.infer<TResultSchema>;
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

async function consumeEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, payload: unknown) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    buffer = `${buffer}${decoder.decode(value, { stream: !done })}`.replaceAll('\r\n', '\n');
    if (buffer.length > MAX_STREAM_EVENT_CHARACTERS) {
      throw new ApiError({
        status: 502,
        code: 'api_progress_event_too_large',
        message: 'The progress stream exceeded its safe event size.'
      });
    }
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      dispatchEventBlock(block, onEvent);
      boundary = buffer.indexOf('\n\n');
    }
    if (done) break;
  }
  if (buffer.trim()) dispatchEventBlock(buffer, onEvent);
}

function dispatchEventBlock(block: string, onEvent: (event: string, payload: unknown) => void) {
  const lines = block.split('\n');
  if (lines.every(line => !line || line.startsWith(':'))) return;
  const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim() || 'message';
  const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
  if (!data) return;
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    throw new ApiError({
      status: 502,
      code: 'api_progress_event_invalid',
      message: 'The server returned an invalid progress event.'
    });
  }
  onEvent(event, payload);
}

function parseStreamContract<TSchema extends ZodType>(
  schema: TSchema,
  payload: unknown,
  path: string,
  event: string
): z.infer<TSchema> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    emitTelemetry('contract_error', {
      path: path.split('?', 1)[0],
      event,
      issueCount: parsed.error.issues.length
    });
    throw parsed.error;
  }
  return parsed.data;
}

function apiErrorFromStream(payload: unknown) {
  const record = isRecord(payload) ? payload : {};
  const nested = isRecord(record.error) ? record.error : {};
  return new ApiError({
    status: Number(record.status || nested.status || 400),
    code: String(nested.code || record.code || 'api_request_failed'),
    message: String(nested.message || record.message || 'Request failed.'),
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
