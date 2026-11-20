import { dubError } from "../../repositories/dub-sub/DubProjectRepository.js";

export const languages = ["th", "zh", "zh-CN", "zh-TW", "en"];
export const fail = () => {
  throw dubError("dub_invalid_input");
};
export function label(value, max = 200, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim()) ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)
  )
    fail();
  return value;
}
function number(value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) fail();
  return value;
}
function choice(value, options) {
  if (!options.includes(value)) fail();
  return value;
}
export function targetList(value) {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 2 ||
    new Set(value).size !== value.length
  )
    fail();
  return value.map((item) => choice(item, languages));
}
export function sourceLanguage(value) {
  return choice(value, ["auto", ...languages]);
}

function mapObject(value) {
  if (!value || Array.isArray(value) || typeof value !== "object") fail();
  return value;
}
export async function speakerSettings(
  project,
  input,
  targets,
  resolveCharacter,
) {
  const result = {};
  const checked = new Set();
  for (const field of ["characterMappings", "mixer"]) {
    const mapping = mapObject(input[field] ?? project[field] ?? {});
    const output = Object.create(null);
    for (const lang of targets) {
      const entries = Object.entries(mapObject(mapping[lang] ?? {}));
      if (entries.length > 200) fail();
      output[lang] = Object.create(null);
      for (const [name, value] of entries) {
        label(name, 120, true);
        if (Object.hasOwn(Object.prototype, name) || name === "prototype")
          fail();
        if (field === "characterMappings") {
          const id = label(value, 160, true);
          if (
            !checked.has(id) &&
            project.characterMappings?.[lang]?.[name] !== id
          ) {
            await resolveCharacter(id);
            checked.add(id);
          }
          output[lang][name] = id;
        } else {
          const settings = mapObject(value);
          if (
            typeof settings.mute !== "boolean" ||
            typeof settings.solo !== "boolean"
          )
            fail();
          output[lang][name] = {
            gain: number(settings.gain, 0, 2),
            mute: settings.mute,
            solo: settings.solo,
          };
        }
      }
    }
    result[field] = output;
  }
  return result;
}

export function assertUnlocked(previous, tracks, cues) {
  const locked = Object.keys(previous.tracks).filter(
    (key) => previous.tracks[key].locked && tracks[key]?.locked !== false,
  );
  if (!locked.length) return;
  const failLock = () => {
    throw dubError("dub_track_locked", 409);
  };
  if (
    previous.cues.length !== cues.length ||
    locked.some((key) => !tracks[key])
  )
    failLock();
  const byId = new Map(cues.map((cue) => [cue.id, cue]));
  for (const old of previous.cues) {
    const next = byId.get(old.id);
    if (!next || old.startMs !== next.startMs || old.endMs !== next.endMs)
      failLock();
    for (const lang of locked) {
      if (lang === "source" && old.text !== next.text) failLock();
      if (
        lang !== "source" &&
        old.translations[lang] !== next.translations[lang]
      )
        failLock();
    }
  }
}

export function tracksFor(input, targets) {
  const tracks = {};
  for (const [index, key] of ["source", ...targets].entries()) {
    const v = input?.[key] || {};
    tracks[key] = {
      visible: v.visible === undefined ? index > 0 : Boolean(v.visible),
      locked: Boolean(v.locked),
      font: choice(v.font ?? "sans", ["sans", "serif"]),
      color: choice(v.color ?? "white", ["white", "yellow"]),
      size: number(v.size ?? 48, 8, 200),
      x: number(v.x ?? 50, 0, 100),
      y: number(v.y ?? (index === 1 ? 85 : index === 2 ? 70 : 55), 0, 100),
      maxChars: Math.round(number(v.maxChars ?? 42, 4, 200)),
    };
  }
  return tracks;
}

export async function normalizeCues(rows, project, resolveTake) {
  if (!Array.isArray(rows) || rows.length > 3000) fail();
  const ids = new Set();
  const takes = new Map();
  const normalized = [];
  for (const raw of rows) {
    if (
      !raw ||
      typeof raw.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(raw.id) ||
      ids.has(raw.id)
    )
      fail();
    ids.add(raw.id);
    if (
      !Number.isInteger(raw.startMs) ||
      !Number.isInteger(raw.endMs) ||
      raw.startMs < 0 ||
      raw.endMs <= raw.startMs ||
      raw.endMs > project.durationMs
    )
      throw dubError("dub_invalid_timing");
    const cue = {
      id: raw.id,
      startMs: raw.startMs,
      endMs: raw.endMs,
      text: label(raw.text ?? "", 4000),
      speaker: label(raw.speaker ?? "", 120),
      characterId: label(raw.characterId ?? "", 160),
      emotion: label(raw.emotion ?? "", 100),
      direction: label(raw.direction ?? "", 1000),
      dubText: label(raw.dubText ?? "", 4000),
      offsetMs: Math.round(
        number(raw.offsetMs ?? 0, -project.durationMs, project.durationMs),
      ),
      gain: number(raw.gain ?? 1, 0, 4),
      translations: {},
      takes: {},
      voiceBindings: {},
    };
    for (const lang of project.targetLanguages) {
      if (raw.translations?.[lang] !== undefined)
        cue.translations[lang] = label(raw.translations[lang], 4000);
      const binding = raw.voiceBindings?.[lang];
      if (binding) {
        label(binding.documentId, 160, true);
        label(binding.rowId, 160, true);
        cue.voiceBindings[lang] = {};
        for (const key of [
          "documentId",
          "rowId",
          "characterId",
          "characterPresetId",
          "operationId",
          "modelId",
          "voiceId",
          "emotion",
          "direction",
          "text",
          "dubText",
        ]) {
          if (binding[key] !== undefined)
            cue.voiceBindings[lang][key] = label(binding[key], 4000);
        }
      }
      const id =
        raw.takes?.[lang]?.id ||
        (lang === project.targetLanguages[0] && raw.selectedTakeId);
      if (id) {
        label(id, 160, true);
        if (!takes.has(id)) takes.set(id, await resolveTake(id));
        const take = takes.get(id);
        cue.takes[lang] = {
          id: take.id,
          audioUrl: take.audioUrl,
          durationMs: take.durationMs,
        };
      }
    }
    cue.selectedTakeId = cue.takes[project.targetLanguages[0]]?.id ?? null;
    normalized.push(cue);
  }
  return normalized.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}
