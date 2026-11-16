import { describe, expect, it } from "vitest";
import { duplicateRow, moveRow, newRow, isStaleTake } from "./rowCommands";
import { takeSchema } from "../schemas/voiceStudioSchemas";

describe("Voice Studio row identity", () => {
  it("duplicates only editable inputs without carrying selected audio", () => {
    const source = {
      ...newRow("character-a"),
      text: "หนึ่ง\nสอง",
      selectedTakeId: "take-a",
    };
    const copy = duplicateRow(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.selectedTakeId).toBeNull();
    expect(copy.text).toBe(source.text);
    expect(copy.characterPresetId).toBe("character-a");
  });
  it("reordering preserves row and Take association", () => {
    const first = { ...newRow(), selectedTakeId: "take-a" };
    const second = { ...newRow(), selectedTakeId: "take-b" };
    const moved = moveRow([first, second], first.id, 1);
    expect(moved[1]).toBe(first);
    expect(moved[1]?.selectedTakeId).toBe("take-a");
    expect(moveRow(moved, second.id, -1)).toBe(moved);
  });
  it("detects changed text, voice and model without modifying old Take", () => {
    const row = {
      ...newRow("character-a"),
      text: "สวัสดี",
      delivery: { emotion: "calm" },
    };
    const take = takeSchema.parse({
      id: "t",
      documentId: "d",
      rowId: row.id,
      jobId: "j",
      outputAssetId: "a",
      inputSnapshot: {
        text: row.text,
        delivery: row.delivery,
        voiceId: "Kore",
        characterName: "A",
        modelId: "model",
      },
      audioUrl: "/outputs/voice-studio/a.wav",
      durationMs: 1000,
      displayTitle: "Hello",
      tags: [],
      savedAt: null,
      metadataRevision: 1,
      createdAt: "2026-11-15",
    });
    expect(isStaleTake(row, take, "Kore", "model")).toBe(false);
    expect(isStaleTake({ ...row, text: "แก้ไข" }, take, "Kore", "model")).toBe(
      true,
    );
    expect(isStaleTake(row, take, "Puck", "model")).toBe(true);
    expect(isStaleTake(row, take, "Kore", "new-model")).toBe(true);
    expect(take.inputSnapshot.text).toBe("สวัสดี");
  });
  it("rejects unsafe output URLs at the API boundary", () => {
    expect(
      takeSchema.shape.audioUrl.safeParse("https://provider.invalid/audio.wav")
        .success,
    ).toBe(false);
    expect(
      takeSchema.shape.audioUrl.safeParse("/outputs/../private").success,
    ).toBe(false);
  });
});
