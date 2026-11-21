import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  useActor,
  type HistoryItem,
  type GenerationReferenceRole,
} from "../../../lib/canonical";
import { roles } from "../state/imageDraft";

export function ImageResultActions({
  item,
  onPrompt,
  onReference,
}: {
  item: HistoryItem;
  onPrompt: (prompt: string) => void;
  onReference: (item: HistoryItem, role: GenerationReferenceRole) => void;
}) {
  const { t } = useTranslation();
  const { identityScope } = useActor();
  const navigate = useNavigate();
  const [role, setRole] = useState<GenerationReferenceRole>("style_reference");
  return (
    <div className="result-info">
      <div>
        <strong>{item.submodel}</strong>
        <span>
          {item.width && item.height
            ? `${item.width} × ${item.height}`
            : item.provider}
        </span>
      </div>
      <details>
        <summary>{t("details")}</summary>
        <p className="result-prompt">{item.prompt}</p>
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild><button>{t("reuse")}</button></AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="app-confirm-dialog__overlay" />
            <AlertDialog.Content className="app-confirm-dialog__content">
              <AlertDialog.Title>{t("reuse")}</AlertDialog.Title>
              <AlertDialog.Description>{t("replaceConfirm")}</AlertDialog.Description>
              <div>
                <AlertDialog.Cancel asChild><button>{t("cancel")}</button></AlertDialog.Cancel>
                <AlertDialog.Action asChild><button className="primary" onClick={() => onPrompt(item.prompt)}>{t("replace")}</button></AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </details>
      <div className="reuse-reference">
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
        <button onClick={() => onReference(item, role)}>
          {t("useReference")}
        </button>
      </div>
      <div className="handoff-actions">
        <button
          onClick={() =>
            navigate("/comparison", {
              state: {
                identityScope,
                handoff: { kind: "image", item, action: "settings" },
              },
            })
          }
        >
          {t("useComparison")}
        </button>
        <button
          onClick={() =>
            navigate("/comparison", {
              state: {
                identityScope,
                handoff: { kind: "image", item, action: "reference" },
              },
            })
          }
        >
          {t("referenceComparison")}
        </button>
        <button
          onClick={() =>
            navigate("/video", {
              state: {
                identityScope,
                handoff: { kind: "image", item, action: "reference" },
              },
            })
          }
        >
          {t("useVideo")}
        </button>
      </div>
    </div>
  );
}
