import { apiRequest } from "../../../lib/api/apiClient";
import { z } from "zod";
import {
  catalogSchema,
  charactersSchema,
  characterSchema,
  documentsSchema,
  documentSchema,
  takesSchema,
  takeSchema,
  quoteSchema,
  operationSchema,
  customVoiceSchema,
  customVoicesSchema,
  type VoiceDocument,
} from "../schemas/voiceStudioSchemas";

const root = "/api/voice-studio";
const key = encodeURIComponent;
const rowPath = (doc: string, row: string) =>
  `${root}/documents/${key(doc)}/rows/${key(row)}`;
export const voiceApi = {
  catalog: () => apiRequest(`${root}/catalog`, { schema: catalogSchema }),
  documents: (cursor?: string) =>
    apiRequest(
      `${root}/documents?archived=true&limit=20${cursor ? `&cursor=${key(cursor)}` : ""}`,
      { schema: documentsSchema },
    ),
  document: (id: string) =>
    apiRequest(`${root}/documents/${key(id)}`, { schema: documentSchema }),
  createDocument: () =>
    apiRequest(`${root}/documents`, {
      method: "POST",
      body: {},
      schema: documentSchema,
    }),
  saveDocument: (doc: VoiceDocument) =>
    apiRequest(`${root}/documents/${key(doc.id)}`, {
      method: "PATCH",
      body: {
        expectedRevision: doc.revision,
        title: doc.title,
        modelId: doc.modelId,
        language: doc.language,
        rows: doc.rows,
      },
      schema: documentSchema,
    }),
  archiveDocument: (doc: VoiceDocument, archived = true) =>
    apiRequest(`${root}/documents/${key(doc.id)}/archive`, {
      method: "POST",
      body: { expectedRevision: doc.revision, archived },
      schema: documentSchema,
    }),
  characters: (cursor?: string) =>
    apiRequest(
      `${root}/characters?archived=true&limit=50${cursor ? `&cursor=${key(cursor)}` : ""}`,
      { schema: charactersSchema },
    ),
  saveCharacter: (input: {
    id?: string;
    name: string;
    color: string;
    voiceId: string;
    voiceKind?: "prebuilt" | "custom";
    expectedRevision?: number;
  }) =>
    apiRequest(`${root}/characters${input.id ? `/${key(input.id)}` : ""}`, {
      method: input.id ? "PATCH" : "POST",
      body: input,
      schema: characterSchema,
    }),
  archiveCharacter: (id: string, revision: number, archived = true) =>
    apiRequest(`${root}/characters/${key(id)}/archive`, {
      method: "POST",
      body: { expectedRevision: revision, archived },
      schema: characterSchema,
    }),
  takes: (doc: string, row: string) =>
    apiRequest(`${rowPath(doc, row)}/takes`, { schema: takesSchema }),
  quote: (doc: string, row: string, revision: number) =>
    apiRequest(`${rowPath(doc, row)}/quotes`, {
      method: "POST",
      body: { expectedRevision: revision },
      schema: quoteSchema,
    }),
  generate: (
    doc: string,
    row: string,
    revision: number,
    quoteId: string,
    requestId: string,
  ) =>
    apiRequest(`${rowPath(doc, row)}/generations`, {
      method: "POST",
      body: { expectedRevision: revision, quoteId, requestId },
      schema: operationSchema,
    }),
  operation: (id: string) =>
    apiRequest(`${root}/generations/${key(id)}`, { schema: operationSchema }),
  select: (doc: string, row: string, takeId: string | null, revision: number) =>
    apiRequest(`${rowPath(doc, row)}/selected-take`, {
      method: "PUT",
      body: { takeId, expectedRevision: revision },
      schema: documentSchema,
    }),
  saveTake: (id: string) =>
    apiRequest(`${root}/takes/${key(id)}/save`, {
      method: "POST",
      body: {},
      schema: takeSchema,
    }),
  updateTake: (
    id: string,
    revision: number,
    displayTitle: string,
    tags: string[],
  ) =>
    apiRequest(`${root}/takes/${key(id)}`, {
      method: "PATCH",
      body: { expectedRevision: revision, displayTitle, tags },
      schema: takeSchema,
    }),
  deleteTake: (id: string) =>
    apiRequest(`${root}/takes/${key(id)}`, {
      method: "DELETE",
      schema: z.object({ deleted: z.boolean() }),
    }),
  library: (params: URLSearchParams) =>
    apiRequest(`${root}/audio-library?${params}`, { schema: takesSchema }),
  customVoices: (params = new URLSearchParams()) =>
    apiRequest(`${root}/custom-voices?${params}`, {
      schema: customVoicesSchema,
    }),
  quoteVoiceDesign: (input: {
    name: string;
    description: string;
    modelId: string;
    language: string;
  }) =>
    apiRequest(`${root}/custom-voices/quotes`, {
      method: "POST",
      body: input,
      schema: quoteSchema,
    }),
  designVoice: (input: {
    name: string;
    description: string;
    modelId: string;
    language: string;
    quoteId: string;
    requestId: string;
  }) =>
    apiRequest(`${root}/custom-voices`, {
      method: "POST",
      body: input,
      schema: operationSchema,
    }),
  saveCustomVoice: (id: string) =>
    apiRequest(`${root}/custom-voices/${key(id)}/save`, {
      method: "POST",
      body: {},
      schema: customVoiceSchema,
    }),
  updateCustomVoice: (
    id: string,
    input: {
      expectedRevision: number;
      name?: string;
      displayDescription?: string;
      archived?: boolean;
    },
  ) =>
    apiRequest(`${root}/custom-voices/${key(id)}`, {
      method: "PATCH",
      body: input,
      schema: customVoiceSchema,
    }),
  deleteCustomVoice: (id: string) =>
    apiRequest(`${root}/custom-voices/${key(id)}`, {
      method: "DELETE",
      schema: z.object({ deleted: z.boolean() }),
    }),
  audio: async (url: string) => {
    const result = await apiRequest(url, { responseType: "blob" });
    if (!(result instanceof Blob)) throw new Error("Invalid audio response");
    return result;
  },
};
