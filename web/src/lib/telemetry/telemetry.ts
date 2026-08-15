type TelemetryEvent =
  | 'api_error'
  | 'contract_error'
  | 'generation_transition'
  | 'route_error'
  | 'render_error';

type TelemetryFields = Record<string, string | number | boolean | null | undefined>;

export function emitTelemetry(event: TelemetryEvent, fields: TelemetryFields = {}) {
  if (!import.meta.env.DEV) return;
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([key]) =>
      !/(prompt|reference|base64|imageUrl|token|secret|email)/i.test(key)
    )
  );
  console.info('[MPF telemetry]', {
    event,
    build: String(import.meta.env.VITE_BUILD_SHA || 'local'),
    at: new Date().toISOString(),
    ...safeFields
  });
}

export function createCorrelationId() {
  return `ui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
