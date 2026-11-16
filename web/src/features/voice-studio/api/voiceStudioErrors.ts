/** Stable server codes stay available for support; UI recovery text stays localized. */
export function voiceErrorMessage(error: unknown, t: (key: string) => string) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const key = /revision|conflict/.test(code)
    ? "revisionConflict"
    : /voice_custom_in_use/.test(code)
      ? "customVoiceInUse"
      : /custom_limit|project_limit/.test(code)
        ? "voiceQuotaReached"
        : /provider_connection_changed/.test(code)
          ? "voiceConnectionChanged"
          : /take_in_use/.test(code)
            ? "takeInUse"
            : /unavailable|disabled|unpriced/.test(code)
              ? "generationUnavailable"
              : "failed";
  return `${t(key)}${code ? ` (${code})` : ""}`;
}
