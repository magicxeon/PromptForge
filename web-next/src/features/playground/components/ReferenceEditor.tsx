import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { MediaImage } from "../../../components/media/MediaImage";
import { roles, referenceUrl, type ImageReference } from "../state/imageDraft";
import type { GenerationReferenceRole } from "../../../lib/canonical";
export function ReferenceEditor({
  references,
  max,
  supported,
  upload,
  remove,
  inspect,
}: {
  references: ImageReference[];
  max: number;
  supported: boolean;
  upload: (file: File, role: GenerationReferenceRole) => void;
  remove: (id: string) => void;
  inspect: (reference: ImageReference) => void;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState<GenerationReferenceRole>("style_reference");
  const occupied = references.some((ref) => ref.role === role);
  return (
    <section className="reference-editor">
      <div className="section-heading">
        <h2>{t("references")}</h2>
        <span>
          {references.length} / {max}
        </span>
      </div>
      {!supported && <p className="muted">{t("unsupported")}</p>}
      <div className="reference-list">
        {references.map((ref) => (
          <article
            key={ref.id}
            className={`reference-row ${ref.status !== "ready" ? "reference-attention" : ""}`}
          >
            <button
              className="reference-thumbnail"
              disabled={!referenceUrl(ref)}
              aria-label={`${t("expand")} ${t(ref.role)}`}
              onClick={() => inspect(ref)}
            >
              {referenceUrl(ref) ? (
                <MediaImage src={referenceUrl(ref)} alt={ref.name} />
              ) : (
                <Plus size={18} />
              )}
            </button>
            <div className="reference-name">
              <strong>{t(ref.role)}</strong>
              <small>{ref.name}</small>
              <span>
                {t(
                  ref.status === "failed"
                    ? "referenceError"
                    : ref.status === "reselect"
                      ? "reselect"
                      : ref.status,
                )}
              </span>
            </div>
            <label className="small-button">
              {t("replace")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file, ref.role);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              aria-label={`${t("remove")} ${t(ref.role)}`}
              onClick={() => remove(ref.id)}
            >
              <X size={15} />
            </button>
          </article>
        ))}
      </div>
      {supported && (
        <div className="reference-add">
          <select
            aria-label={t("chooseRole")}
            value={role}
            onChange={(e) => setRole(e.target.value as GenerationReferenceRole)}
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
          <label
            className={`button ${occupied || references.length >= max ? "disabled" : ""}`}
          >
            <Plus size={16} />
            {t("addImage")}
            <input
              type="file"
              accept="image/*"
              disabled={occupied || references.length >= max}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file, role);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
    </section>
  );
}
