// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { DubVoice } from "./DubVoice";

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
vi.mock("../../components/media/MediaImage", () => ({
  usePrivateImage: () => privateMedia,
}));
afterEach(cleanup);

it("resolves a returned saved voice beyond the first page and rejects an unavailable choice", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  api.catalog.mockResolvedValue({
    models: [{ id: "g", displayName: "G", capabilities: { languages: ["th"] } }],
    voices: [], policy: {},
  });
  api.characters.mockResolvedValue({ items: [] });
  api.customVoices.mockImplementation(async (params: URLSearchParams) =>
    params.get("cursor") === "more"
      ? { items: [{ id: "voice42", name: "Voice 42", savedAt: "today", lifecycleState: "ready", language: "th", modelId: "g" }] }
      : { items: [], nextCursor: "more" },
  );
  const inspect = (voice: string) => (
    <QueryClientProvider client={client}>
      <DubVoice key={voice} projectId="p" cueId="c" text="test" language="th" speaker=""
        initialSelection={"custom/" + voice} onBind={() => {}} onUse={() => {}} />
    </QueryClientProvider>
  );
  const view = render(inspect("voice42"));
  await screen.findByRole("option", { name: "Voice 42" });
  expect((screen.getByLabelText("character") as HTMLSelectElement).value).toBe("custom/voice42");
  view.rerender(inspect("removed"));
  await screen.findByRole("option", { name: "selectionUnavailable" });
  expect((screen.getByText("quote") as HTMLButtonElement).disabled).toBe(true);
});

it("quotes first, sends the directed cue once, and keeps placing and saving a take independent", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const character = {
    id: "hero",
    name: "Hero",
    voiceId: "seed-speaker",
    voiceKind: "prebuilt",
  };
  const doc = {
    id: "doc",
    rows: [{ id: "row", text: "", delivery: {}, enabled: true }],
    revision: 1,
    modelId: "seed",
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
      { id: "seed", displayName: "Seed", capabilities: { languages: ["th"] } },
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
  api.customVoices.mockResolvedValue({ items: [] });
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
  render(
    <QueryClientProvider client={queryClient}>
      <DubVoice
        projectId="p"
        cueId="c"
        language="th"
        text="สวัสดี"
        speaker="Hero"
        binding={{ documentId: "doc", rowId: "row" }}
        onBind={() => {}}
        onUse={onUse}
        onAudition={onAudition}
      />
    </QueryClientProvider>,
  );
  fireEvent.change(await screen.findByLabelText("emotion"), {
    target: { value: "happy" },
  });
  fireEvent.click(screen.getByText("quote"));
  const generate = await screen.findByText("generate");
  expect(api.generate).not.toHaveBeenCalled();
  expect(api.saveDocument.mock.calls[0][0].rows[0]).toMatchObject({
    text: "สวัสดี",
    characterPresetId: "hero",
    delivery: { emotion: "happy" },
  });
  fireEvent.click(generate);
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
