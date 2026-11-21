export function createSpeechRequest() {
  const requestId = crypto.randomUUID();
  return { requestId, id: `speech_${requestId}` };
}
