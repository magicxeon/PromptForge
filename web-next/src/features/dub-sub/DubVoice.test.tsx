// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DubVoice } from "./DubVoice";
import { useState } from "react";
import type { CueDelivery } from "./projectApi";

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  characters: vi.fn(),
  customVoices: vi.fn(),
  document: vi.fn(),
  saveDocument: vi.fn(),
  quote: vi.fn(),
  generate: vi.fn(),
  operation: vi.fn(),
  takes: vi.fn(),
  select: vi.fn(),
  saveTake: vi.fn(),
}));
vi.mock("../../../../web/src/features/voice-studio/api/voiceStudioApi", () => ({
  voiceApi: api,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../lib/canonical", () => ({
  useActor: () => ({ identityScope: "session:a" }),
  getIdentitySnapshot: () => ({ epoch: 0 }),
  pollingPolicy: { comparison: () => false },
  ProcessingSpinner: () => null,
}));
const privateMedia = vi.hoisted(() => ({ url: "" }));
const policy = vi.hoisted(() => ({ creditsEnabled: true }));
vi.mock("../../lib/workspaceConfig", () => ({ useWorkspaceCredits: () => policy.creditsEnabled }));
vi.mock("../../components/media/MediaImage", () => ({
  usePrivateImage: () => privateMedia,
}));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); policy.creditsEnabled = true; });

it("resolves a returned saved voice beyond the first page and rejects an unavailable choice", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  api.catalog.mockResolvedValue({
    models: [{ id: "dola-seed-audio", displayName: "Seed", capabilities: { languages: ["th"] } }],
    voices: [], policy: {},
  });
  api.characters.mockResolvedValue({ items: [] });
  api.customVoices.mockImplementation(async (params: URLSearchParams) =>
    params.get("cursor") === "more"
      ? { items: [{ id: "voice42", name: "Voice 42", savedAt: "today", lifecycleState: "ready", language: "th", modelId: "dola-seed-audio" }] }
      : { items: [{id:"legacy", name:"Legacy Gemini", modelId:"gemini-tts", language:"th", savedAt:"today", lifecycleState:"ready"}], nextCursor: "more" },
  );
  const inspect = (voice: string) => (
    <QueryClientProvider client={client}>
      <DubVoice key={voice} projectId="p" cueId="c" text="test" language="th" speaker=""
        initialSelection={"custom/" + voice} onBind={() => {}} onUse={() => {}} onDeliveryChange={() => {}} />
    </QueryClientProvider>
  );
  const view = render(inspect("voice42"));
  await screen.findByRole("option", { name: "Voice 42" });
  expect((screen.getByLabelText("character") as HTMLSelectElement).value).toBe("voice42");
  expect(screen.queryByLabelText("model")).toBeNull();
  expect(screen.queryByRole("option", {name:"Legacy Gemini"})).toBeNull();
  view.rerender(inspect("removed"));
  await screen.findByRole("option", { name: "selectionUnavailable" });
  expect((screen.getByText("quote") as HTMLButtonElement).disabled).toBe(true);
});

it.each([true, false])("sends the directed cue once and preserves take actions with creditsEnabled=%s", async (creditsEnabled) => {
  policy.creditsEnabled = creditsEnabled;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const character = {
    id: "hero",
    name: "Hero",
    voiceId: "seed-speaker",
    voiceKind: "custom",
  };
  const doc = {
    id: "doc",
    rows: [{ id: "row", text: "", delivery: {}, enabled: true }],
    revision: 1,
    modelId: "dola-seed-audio",
  };
  const take = {
    id: "op",
    audioUrl: "/outputs/voice-studio/a.wav",
    durationMs: 1500,
    inputSnapshot: { characterName: "Hero" },
  };
  const onUse = vi.fn(),
    onAudition = vi.fn();
  api.catalog.mockResolvedValue({
    models: [
      { id: "dola-seed-audio", displayName: "Seed", capabilities: { languages: ["th"] } },
    ],
    voices: [
      {
        id: "seed-speaker",
        displayName: "A",
        modelIds: ["seed"],
        languages: ["th"],
      },
    ],
    policy: { stylePresets: { emotion: ["happy"] } },
  });
  api.characters.mockResolvedValue({ items: [character] });
  api.customVoices.mockResolvedValue({ items: [{id:character.voiceId, name:"Saved Seed", savedAt:"today", lifecycleState:"ready", language:"th", modelId:"dola-seed-audio"}] });
  api.document.mockResolvedValue(doc);
  api.saveDocument.mockImplementation(async (d) => ({ ...d, revision: 2 }));
  api.quote.mockResolvedValue({ id: "op", totalCredits: 10 });
  api.generate.mockResolvedValue({ id: "op", status: "queued" });
  api.operation.mockResolvedValue({ id: "op", status: "succeeded", take });
  api.takes.mockResolvedValue({ items: [] });
  api.select.mockResolvedValue({
    ...doc,
    rows: [{ ...doc.rows[0], selectedTakeId: "op" }],
    revision: 3,
  });
  api.saveTake.mockResolvedValue({ ...take, savedAt: "now" });
  function DirectedCue() {
    const [overrides, setOverrides] = useState<CueDelivery>({});
    return (
    <QueryClientProvider client={queryClient}>
      <DubVoice
        projectId="p"
        cueId="c"
        language="th"
        text="สวัสดี"
        speaker="Hero"
        targetMs={2400}
        loadSpeechWindows={async()=>[{startMs:120,endMs:1650}]}
        defaultCharacterId="hero"
        suggestedDelivery={{direction:"A soft greeting."}}
        overrides={overrides} onDeliveryChange={setOverrides}
        binding={{ documentId: "doc", rowId: "row" }}
        onBind={() => {}}
        onUse={onUse}
        onAudition={onAudition}
      />
    </QueryClientProvider>
    );
  }
  render(<DirectedCue />);
  fireEvent.click(await screen.findByText("editPerformance"));
  fireEvent.change(await screen.findByLabelText("emotion"), {
    target: { value: "happy" },
  });
  expect(api.generate).not.toHaveBeenCalled();
  if (creditsEnabled) {
    fireEvent.click(screen.getByText("quote"));
    fireEvent.click(await screen.findByText("generate"));
  } else {
    expect(screen.queryByText("quote")).toBeNull();
    fireEvent.click(screen.getByText("generateTake"));
  }
  await waitFor(() => expect(api.generate).toHaveBeenCalledTimes(1));
  expect(api.quote).toHaveBeenCalledTimes(creditsEnabled ? 1 : 0);
  if (!creditsEnabled) {
    const [, , , operationId, requestId] = api.generate.mock.calls[0];
    expect(operationId).toBe(`speech_${requestId}`);
  }
  expect(api.saveDocument.mock.calls[0][0].rows[0]).toMatchObject({
    targetDurationMs: 2400,
    speechWindows:[{startMs:120,endMs:1650}],
    text: "สวัสดี",
    characterPresetId: "hero",
    delivery: { emotion: "happy", direction: "A soft greeting." },
  });
  fireEvent.click(await screen.findByText("listen"));
  expect(onAudition).toHaveBeenCalledWith(take);
  fireEvent.click(screen.getByText("use"));
  await waitFor(() =>
    expect(onUse).toHaveBeenCalledWith({
      id: take.id,
      audioUrl: take.audioUrl,
      durationMs: take.durationMs,
    }),
  );
  expect(api.saveTake).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByText("save"));
  await waitFor(() => expect(api.saveTake).toHaveBeenCalledWith("op"));
  expect(api.generate).toHaveBeenCalledTimes(1);
});

it.each(["original", "edited"])("recovers a missing direct operation with %s cue text", async (text) => {
  policy.creditsEnabled = false;
  const requestId = crypto.randomUUID();
  const id = "speech_" + requestId;
  const binding = {documentId:"doc", rowId:"row", characterId:"hero", operationId:id, operationRevision:2};
  const onBind = vi.fn();
  api.catalog.mockResolvedValue({
    models: [{id:"dola-seed-audio", capabilities:{languages:["en"]}}],
    voices: [{id:"speaker", modelIds:["seed"], languages:["en"]}], policy:{},
  });
  api.characters.mockResolvedValue({items:[{id:"hero", name:"Hero", voiceId:"speaker", voiceKind:"custom"}]});
  api.customVoices.mockResolvedValue({items:[{id:"speaker", name:"Saved Seed", savedAt:"today", lifecycleState:"ready", language:"en", modelId:"dola-seed-audio"}]});
  api.document.mockResolvedValue({id:"doc", modelId:"dola-seed-audio", language:"en", revision:2,
    rows:[{id:"row", characterPresetId:"hero", text:"original", delivery:{}, enabled:true}]});
  api.operation.mockRejectedValue(Object.assign(new Error("missing"), {status:404}));
  api.takes.mockResolvedValue({items:[]});
  const client = new QueryClient({defaultOptions:{queries:{retry:false, gcTime:0}}});
  render(<QueryClientProvider client={client}><DubVoice projectId="p" cueId="c" text={text} language="en" speaker="Hero"
    binding={binding} loadSpeechWindows={async () => [{startMs:250,endMs:750}]} onBind={onBind} onUse={() => {}} onDeliveryChange={() => {}} /></QueryClientProvider>);
  await screen.findByText("requestMissing");
  expect(api.generate).not.toHaveBeenCalled();
  if (text === "original") {
    fireEvent.click(screen.getByText("retryTake"));
    await waitFor(() => expect(api.generate).toHaveBeenCalledWith("doc", "row", 2, id, requestId));
    expect(api.quote).not.toHaveBeenCalled();
  } else {
    expect(screen.queryByText("retryTake")).toBeNull();
    fireEvent.click(screen.getByText("editTake"));
    await waitFor(() => expect(onBind).toHaveBeenCalledWith({...binding, operationId:undefined, operationRevision:undefined}));
    expect(api.generate).not.toHaveBeenCalled();
  }
});

it("stops and detaches the private preview when the inspector closes", async () => {
  const pause = vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => {});
  const load = vi
    .spyOn(HTMLMediaElement.prototype, "load")
    .mockImplementation(() => {});
  privateMedia.url = "blob:fixture-private-take";
  try {
    api.catalog.mockResolvedValue({ models: [], voices: [], policy: {} });
    api.characters.mockResolvedValue({ items: [] });
    api.customVoices.mockResolvedValue({ items: [] });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const view = render(
      <QueryClientProvider client={client}>
        <DubVoice
          projectId="p"
          cueId="c"
          language="th"
          text="line"
          speaker="A"
          onDeliveryChange={() => {}}
          onBind={() => {}}
          onUse={() => {}}
        />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(view.container.querySelector("audio")?.getAttribute("src")).toBe(
        privateMedia.url,
      ),
    );
    const player = view.container.querySelector("audio")!;
    view.unmount();
    expect(pause).toHaveBeenCalled();
    expect(player.hasAttribute("src")).toBe(false);
    expect(load).toHaveBeenCalled();
  } finally {
    privateMedia.url = "";
    pause.mockRestore();
    load.mockRestore();
  }
});
