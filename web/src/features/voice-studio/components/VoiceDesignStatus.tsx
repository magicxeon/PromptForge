import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";

/** Displays Generation's recorded phase; checking never creates a second operation. */
export function VoiceDesignStatus({
  operationId,
  status,
  errorCode,
  checking,
  readFailed,
  timedOut,
  onCheck,
}: {
  operationId: string;
  status: string;
  errorCode?: string | null;
  checking: boolean;
  readFailed: boolean;
  timedOut: boolean;
  onCheck: () => void;
}) {
  const { t } = useTranslation("voice-studio");
  const delivered = status === "delivered";
  const title = delivered
    ? errorCode === "speech_usage_reconciliation_required"
      ? "usageReconciliationPending"
      : errorCode === "speech_usage_exceeds_consent"
        ? "usageAllowanceReview"
        : "settlementPending"
    : status === "failed"
      ? "designFailed"
      : status === "cancelled"
        ? "designCancelled"
        : status === "reconciliation_required"
          ? "designCheckRequired"
          : "designingVoice";
  return (
    <section className="voice-design-status" aria-label={t("designStatus")}>
      <div
        className="voice-design-status__message"
        role={readFailed ? "alert" : "status"}
      >
        <strong>{t(title)}</strong>
        {delivered ? (
          <p>{t("settlementExplanation")}</p>
        ) : timedOut ? (
          <p>{t("statusUpdatesPaused")}</p>
        ) : null}
        {readFailed ? <p>{t("statusCheckFailed")}</p> : null}
        <div className="voice-design-status__id">
          <span>{t("operationId")}</span>
          <code>{operationId}</code>
        </div>
        {errorCode ? (
          <small className="voice-muted">
            {t("supportCode")}: {errorCode}
          </small>
        ) : null}
      </div>
      <Button
        className="voice-design-status__check"
        loading={checking}
        disabled={checking}
        onClick={onCheck}
      >
        {t("checkStatus")}
      </Button>
    </section>
  );
}
