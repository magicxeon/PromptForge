import { useTranslation } from "react-i18next";
import { useId } from "react";
import { GenerationModelPicker } from "../../../components/generation/GenerationModelPicker";
import { Button } from "../../../components/ui/Button";
import type {
  DialogueRow,
  VoiceCatalog,
  VoiceCharacter,
  CustomVoice,
} from "../schemas/voiceStudioSchemas";

export function RowInspector({
  row,
  index,
  catalog,
  characters,
  modelId,
  customVoices = [],
  onEdit,
  onModel,
  onManageVoices,
}: {
  row: DialogueRow;
  index: number;
  catalog: VoiceCatalog;
  characters: VoiceCharacter[];
  modelId: string;
  customVoices?: CustomVoice[];
  onEdit: (row: DialogueRow) => void;
  onModel: (modelId: string) => void;
  onManageVoices: () => void;
}) {
  const { t } = useTranslation("voice-studio");
  const inspectorId = useId();
  const character = characters.find(
    (item) => item.id === row.characterPresetId,
  );
  const voice = catalog.voices.find((item) => item.id === character?.voiceId);
  return (
    <section className="voice-row-inspector" aria-label={t("rowSettings")}>
      <header>
        <span className="voice-eyebrow">{t("rowSettings")}</span>
        <h2>
          {t("rowNumber", { number: index + 1 })} ·{" "}
          {character?.name || t("chooseCharacter")}
        </h2>
      </header>
      <div className="voice-inspector-voice">
        <small>{t("voice")}</small>
        <strong>
          {character?.voiceKind === "custom"
            ? customVoices.find((voice) => voice.id === character.voiceId)
                ?.name || t("customVoice")
            : voice?.displayName || character?.voiceId || t("chooseCharacter")}
        </strong>
        <Button size="sm" variant="ghost" onClick={onManageVoices}>
          {t("changeVoice")}
        </Button>
      </div>
      <p className="voice-muted">{t("styleScope")}</p>
      {(["emotion", "pace", "method"] as const).map((field) => (
        <label key={field}>
          {t(field)}
          <input
            value={row.delivery[field] || ""}
            list={`${inspectorId}-${field}`}
            maxLength={catalog.policy.maxStyleLength}
            placeholder={t(`${field}Placeholder`)}
            onChange={(event) =>
              onEdit({
                ...row,
                delivery: { ...row.delivery, [field]: event.target.value },
              })
            }
          />
          <datalist id={`${inspectorId}-${field}`}>
            {(
              catalog.policy.stylePresets?.[
                field === "method" ? "delivery" : field
              ] || []
            ).map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </label>
      ))}
      <details>
        <summary>{t("advanced")}</summary>
        <label>
          {t("direction")}
          <textarea
            value={row.delivery.direction || ""}
            rows={3}
            maxLength={catalog.policy.maxStyleLength}
            onChange={(event) =>
              onEdit({
                ...row,
                delivery: { ...row.delivery, direction: event.target.value },
              })
            }
          />
        </label>
      </details>
      <div className="voice-inspector-model">
        <span className="voice-eyebrow">{t("wholeScriptModel")}</span>
        <GenerationModelPicker
          providerId={
            catalog.models.find((model) => model.id === modelId)?.providerId ||
            ""
          }
          modelId={modelId}
          options={catalog.models.map((model) => ({
            providerId: model.providerId,
            modelId: model.id,
            providerLabel: model.providerId,
            modelLabel: model.displayName,
            disabledReason: model.enabled === false ? t("unavailable") : null,
          }))}
          onChange={(value) => onModel(value.modelId)}
        />
      </div>
    </section>
  );
}
