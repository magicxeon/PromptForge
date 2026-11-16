import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { routePaths } from "../../../app/routeRegistry/routes";

/** Protects drafts when navigation originates outside the editor (for example the app sidebar). */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const { t } = useTranslation("voice-studio");
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      !(
        currentLocation.pathname === routePaths.createVoiceStudio &&
        nextLocation.pathname === routePaths.createVoiceStudio
      ),
  );
  const confirmed = useRef(false);
  useEffect(() => {
    if (blocker.state === "unblocked") confirmed.current = false;
  }, [blocker.state]);
  if (blocker.state !== "blocked") return null;
  return (
    <ConfirmDialog
      trigger={<span hidden />}
      open
      title={t("leaveTitle")}
      description={t("leaveDescription")}
      confirmLabel={t("leaveWithoutSaving")}
      onOpenChange={(open) => {
        if (!open && !confirmed.current) blocker.reset();
      }}
      onConfirm={() => {
        confirmed.current = true;
        blocker.proceed();
      }}
    />
  );
}
