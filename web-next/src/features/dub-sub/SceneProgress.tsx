import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { pollingPolicy, ProcessingSpinner, useActor } from "../../lib/canonical";
import { readSceneProgress } from "./projectApi";

export function SceneProgress({ projectId, requestId }: { projectId: string; requestId: string }) {
  const { t } = useTranslation("dub");
  const { identityScope } = useActor();
  const progress = useQuery({
    queryKey: ["dub-scene-progress", identityScope, projectId, requestId],
    queryFn: ({signal}) => readSceneProgress(projectId, requestId, signal),
    enabled: !!requestId,
    retry: false,
    gcTime: 0,
    refetchInterval: query => pollingPolicy.comparison(!!requestId &&
      !["succeeded", "failed", "unknown"].includes(query.state.data?.status ?? "")),
  });
  return <p role="status"><ProcessingSpinner /> {progress.data?.total ? t("scene.progress", progress.data) : t("scene.working")}</p>;
}
