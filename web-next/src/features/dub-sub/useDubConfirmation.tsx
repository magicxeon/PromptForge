import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "./Dialog";

type Confirmation = {
  action: string;
  message: string;
  proceed: () => void;
  destructive?: boolean;
};

// The native dialog stays in the top layer even when opened from the casting dialog.
export function useDubConfirmation() {
  const { t } = useTranslation("dub");
  const descriptionId = useId();
  const [request, ask] = useState<Confirmation | null>(null);
  const cancel = () => ask(null);
  const modal = request && (
    <Dialog label={request.action} descriptionId={descriptionId} onClose={cancel}>
      <h2>{request.action}</h2>
      <p id={descriptionId} className="dub-confirm-description">{request.message}</p>
      <footer>
        <button type="button" onClick={cancel}>{t("cancel")}</button>
        <button type="button" className={request.destructive ? "dub-delete-confirm" : "primary"}
          onClick={() => { cancel(); request.proceed(); }}>{request.action}</button>
      </footer>
    </Dialog>
  );
  return { ask, modal };
}
