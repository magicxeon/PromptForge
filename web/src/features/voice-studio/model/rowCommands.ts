import type { DialogueRow, VoiceTake } from "../schemas/voiceStudioSchemas";

export function newRow(characterPresetId = ""): DialogueRow {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    characterPresetId,
    text: "",
    delivery: {},
    selectedTakeId: null,
  };
}
export function duplicateRow(row: DialogueRow): DialogueRow {
  return {
    ...row,
    id: crypto.randomUUID(),
    delivery: { ...row.delivery },
    selectedTakeId: null,
    activeOperationId: null,
  };
}
export function moveRow(rows: DialogueRow[], id: string, offset: number) {
  const index = rows.findIndex((row) => row.id === id);
  const next = index + offset;
  if (index < 0 || next < 0 || next >= rows.length) return rows;
  const result = [...rows];
  [result[index], result[next]] = [result[next]!, result[index]!];
  return result;
}
export function isStaleTake(
  row: DialogueRow,
  take: VoiceTake,
  voiceId: string | undefined,
  modelId: string,
) {
  return (
    row.text !== take.inputSnapshot.text ||
    voiceId !== take.inputSnapshot.voiceId ||
    modelId !== take.inputSnapshot.modelId ||
    JSON.stringify(row.delivery) !== JSON.stringify(take.inputSnapshot.delivery)
  );
}
