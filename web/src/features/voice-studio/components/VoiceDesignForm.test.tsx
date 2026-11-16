import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceDesignForm } from "./VoiceDesignForm";
import { voiceApi } from "../api/voiceStudioApi";
import {
  catalogSchema,
  customVoiceSchema,
} from "../schemas/voiceStudioSchemas";
const playback = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("./VoicePlayback", () => ({
  useVoicePlayback: () => playback,
  VoicePlaybackControls: () => null,
}));
vi.mock("../api/voiceStudioApi", () => ({
  voiceApi: {
    quoteVoiceDesign: vi.fn(),
    designVoice: vi.fn(),
    operation: vi.fn(),
    saveCustomVoice: vi.fn(),
    generate: vi.fn(),
  },
}));
const catalog = catalogSchema.parse({
  catalogVersion: "v1",
  defaultModelId: "m",
  models: [
    {
      id: "m",
      displayName: "Model",
      providerId: "gemini",
      capabilities: { voiceDesign: true, languages: ["th", "en"] },
    },
  ],
  voices: [],
  policy: {
    maxRows: 100,
    maxTextLength: 2000,
    maxStyleLength: 400,
    inlineTags: [],
  },
});
const voice = customVoiceSchema.parse({
  id: "cv",
  revision: 1,
  operationId: "op",
  name: "Hero voice",
  displayDescription: "Warm Thai voice",
  designPrompt: "Warm Thai voice",
  modelId: "m",
  providerId: "gemini",
  language: "th",
  previewAssetId: "a",
  audioUrl: "/outputs/voice-studio/a.wav",
  durationMs: 1000,
  savedAt: null,
  archivedAt: null,
  expiresAt: null,
  lifecycleState: "ready",
  createdAt: "2026-11-15",
});
function setup(recoveryId?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <VoiceDesignForm
        catalog={catalog}
        actorId="actor"
        recoveryId={recoveryId}
        onChange={() => {}}
        onUse={() => {}}
      />
    </QueryClientProvider>,
  );
}
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(voiceApi.quoteVoiceDesign).mockResolvedValue({
    id: "quote",
    totalCredits: 10,
  });
  vi.mocked(voiceApi.designVoice).mockResolvedValue({
    id: "op",
    status: "queued",
  });
  vi.mocked(voiceApi.operation).mockResolvedValue({
    id: "op",
    status: "succeeded",
    operation: "voice_design",
    customVoice: voice,
  });
  vi.mocked(voiceApi.saveCustomVoice).mockImplementation(async () => {
    const saved = { ...voice, savedAt: "2026-11-15" };
    vi.mocked(voiceApi.operation).mockResolvedValue({
      id: "op",
      status: "succeeded",
      customVoice: saved,
    });
    return saved;
  });
});
describe("Custom Voice design workflow", () => {
  it("shows delivered settlement status and checks the same operation without duplicate requests", async () => {
    const id = "speech_" + "long-support-id-".repeat(20);
    let finish: (
      value: Awaited<ReturnType<typeof voiceApi.operation>>,
    ) => void = () => {};
    vi.mocked(voiceApi.operation)
      .mockResolvedValueOnce({
        id,
        status: "delivered",
        errorCode: "speech_usage_reconciliation_required",
        snapshot: {
          name: "Existing voice",
          description: "Preserved description",
          modelId: "m",
          language: "th",
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    setup(id);
    await screen.findByText("usageReconciliationPending");
    expect(screen.queryByText("designingVoice")).toBeNull();
    expect(screen.getByText(id)).toBeInTheDocument();
    const check = screen.getByRole("button", { name: "checkStatus" });
    fireEvent.click(check);
    fireEvent.click(check);
    expect(check).toBeDisabled();
    expect(check).toHaveAttribute("aria-busy", "true");
    expect(voiceApi.operation).toHaveBeenCalledTimes(2);
    finish({ id, status: "succeeded", customVoice: voice });
    await screen.findByRole("button", { name: "listenSample" });
    expect(screen.getByLabelText("designPrompt")).toHaveValue(
      "Preserved description",
    );
    expect(voiceApi.designVoice).not.toHaveBeenCalled();
    expect(voiceApi.quoteVoiceDesign).not.toHaveBeenCalled();
  });
  it("requires quote confirmation and reuses returned sample for listen/save", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("voiceName"), {
      target: { value: "Hero voice" },
    });
    fireEvent.change(screen.getByLabelText("designPrompt"), {
      target: { value: "Warm Thai voice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "designVoice" }));
    await screen.findByRole("button", { name: "confirmDesign" });
    expect(voiceApi.designVoice).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "confirmDesign" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "listenSample" }),
    );
    expect(playback.play).toHaveBeenCalledExactlyOnceWith([
      { id: "cv", audioUrl: voice.audioUrl, displayTitle: voice.name },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "saveVoice" }));
    await screen.findByRole("button", { name: "useWithCharacter" });
    expect(voiceApi.designVoice).toHaveBeenCalledTimes(1);
    expect(voiceApi.saveCustomVoice).toHaveBeenCalledExactlyOnceWith("cv");
    expect(voiceApi.generate).not.toHaveBeenCalled();
  });
  it("recovers uncertain design status without purchasing another voice", async () => {
    vi.mocked(voiceApi.operation).mockResolvedValue({
      id: "existing",
      status: "reconciliation_required",
      snapshot: {
        name: "Pending voice",
        description: "Existing description",
        modelId: "m",
        language: "th",
      },
    });
    setup("existing");
    await waitFor(() =>
      expect(screen.getByLabelText("voiceName")).toHaveValue("Pending voice"),
    );
    expect(screen.getByLabelText("designPrompt")).toHaveValue(
      "Existing description",
    );
    expect(screen.getByRole("button", { name: "designVoice" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "checkStatus" }));
    await waitFor(() => expect(voiceApi.operation).toHaveBeenCalledTimes(2));
    expect(voiceApi.designVoice).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "listenSample" })).toBeNull();
  });
  it("keeps the description and an existing idempotency request after a failed design submit", async () => {
    vi.mocked(voiceApi.designVoice).mockRejectedValue(
      Object.assign(new Error("quota"), { code: "voice_custom_limit" }),
    );
    setup();
    fireEvent.change(screen.getByLabelText("voiceName"), {
      target: { value: "Hero voice" },
    });
    fireEvent.change(screen.getByLabelText("designPrompt"), {
      target: { value: "Keep this description" },
    });
    fireEvent.click(screen.getByRole("button", { name: "designVoice" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "confirmDesign" }),
    );
    await screen.findByRole("alert");
    expect(screen.getByLabelText("designPrompt")).toHaveValue(
      "Keep this description",
    );
    expect(screen.queryByRole("button", { name: "listenSample" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "confirmDesign" }));
    await waitFor(() => expect(voiceApi.designVoice).toHaveBeenCalledTimes(2));
    expect(vi.mocked(voiceApi.designVoice).mock.calls[0]?.[0].requestId).toBe(
      vi.mocked(voiceApi.designVoice).mock.calls[1]?.[0].requestId,
    );
  });
});
