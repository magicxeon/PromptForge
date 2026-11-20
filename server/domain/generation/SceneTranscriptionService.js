import { readFileSync } from "node:fs";
import { getAuthRuntime } from "../../config/authPolicy.js";
import { GeminiSceneTranscriptionProvider } from "../../providers/GeminiSceneTranscriptionProvider.js";

export const sceneTranscriptionPolicy = Object.freeze(JSON.parse(
  readFileSync(new URL("../../config/dub-scene-transcription.json", import.meta.url), "utf8"),
));

// Operator-funded scene analysis is admitted only by the qualified local live-generation runtime.
export class SceneTranscriptionService {
  constructor({ runtime = getAuthRuntime, provider = new GeminiSceneTranscriptionProvider() } = {}) {
    this.runtime = runtime;
    this.provider = provider;
  }

  assertAccess(actor) {
    const runtime = this.runtime();
    if (runtime.enabled !== true || runtime.liveGeneration !== true || runtime.role !== "admin" ||
        actor?.authMode !== "development_bypass" || actor.role !== "admin" || actor.userId !== runtime.actorId) {
      throw Object.assign(new Error("dub_scene_access_denied"), { code: "dub_scene_access_denied", statusCode: 403 });
    }
  }

  assertAvailable() {
    this.provider.apiKey(sceneTranscriptionPolicy.model);
  }

  transcribe(actor, audio, context) {
    this.assertAccess(actor);
    return this.provider.transcribe(audio, context, sceneTranscriptionPolicy);
  }

  translate(actor, context) {
    this.assertAccess(actor);
    return this.provider.translate(context, sceneTranscriptionPolicy);
  }
}
