import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiRequest, ProcessingSpinner } from "./canonical";

const schema = z.object({ creditsEnabled: z.boolean() });
const CreditsEnabled = createContext<boolean | undefined>(undefined);

export function useWorkspaceCredits() {
  return useContext(CreditsEnabled);
}

export function WorkspaceConfig({ identityScope, children }: { identityScope: string; children: ReactNode }) {
  const { t } = useTranslation();
  const config = useQuery({
    queryKey: ["web-next-config", identityScope],
    queryFn: ({ signal }) => apiRequest("/api/web-next/config", { signal, schema, cache: "no-store" }),
    retry: false,
  });
  return <CreditsEnabled.Provider value={config.isSuccess ? config.data.creditsEnabled : undefined}>
    {config.isPending && <p role="status"><ProcessingSpinner /> {t("loadingSettings")}</p>}
    {config.isError && <p role="alert">{t("settingsUnavailable")} <button onClick={() => void config.refetch()}>{t("retry")}</button></p>}
    {children}
  </CreditsEnabled.Provider>;
}
