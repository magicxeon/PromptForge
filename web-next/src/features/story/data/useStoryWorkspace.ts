import {useRef, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {useActor} from "../../../lib/canonical";
import {getCinematicAuthoringManifest, getCinematicProject} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import {getCinematicSeriesWorkspace} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {CinematicWritingCancelled} from "../../../../../web/src/features/cinematic/api/cinematicWritingBilling";
import type {CinematicProject} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import type {CinematicSeriesWorkspace} from "../../../../../web/src/features/cinematic/schemas/cinematicSeriesSchemas";
import {storyKeys} from "./storyQueryKeys";

type WritingUpdate = {project: CinematicProject; storyProject?: CinematicProject; workspace?: CinematicSeriesWorkspace};
type WritingActivity = "draft" | "outline" | "chapters" | "scenes" | "shots";
export type RunWriting = (job: () => Promise<WritingUpdate | void>, activity?: WritingActivity) => Promise<void>;

export function useStoryWorkspace(id: string) {
  const {identityScope} = useActor();
  const {t} = useTranslation("story");
  const cache = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<WritingActivity>();
  const [error, setError] = useState("");
  const projectKey = storyKeys.project(identityScope, id);
  const seriesKey = storyKeys.series(identityScope, id);
  const query = useQuery({queryKey: projectKey, queryFn: () => getCinematicProject(id), refetchOnWindowFocus: false});
  const chapters = useQuery({queryKey: seriesKey, queryFn: () => getCinematicSeriesWorkspace(id)});
  const manifest = useQuery({queryKey: ["story-manifest", identityScope], queryFn: getCinematicAuthoringManifest});
  const fullStoryOwner = chapters.data?.productionProject.storyProjectId || query.data?.chapterOrigin?.projectId || id;
  const storyRoot = useQuery({
    queryKey: storyKeys.project(identityScope, fullStoryOwner),
    queryFn: () => getCinematicProject(fullStoryOwner),
    enabled: fullStoryOwner !== id,
    refetchOnWindowFocus: false
  });

  const run: RunWriting = async (job, nextActivity) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActivity(nextActivity);
    setError("");
    try {
      const update = await job();
      if (!update) return; // An editable AI draft has not changed any saved project.
      const {project, workspace} = update;
      const savedKey = storyKeys.project(identityScope, project.id);
      await cache.cancelQueries({queryKey: savedKey, exact: true});
      cache.setQueryData(savedKey, project);
      if (update.storyProject && update.storyProject.id !== project.id) {
        const rootKey = storyKeys.project(identityScope, update.storyProject.id);
        await cache.cancelQueries({queryKey: rootKey, exact: true});
        cache.setQueryData(rootKey, update.storyProject);
      }
      if (workspace) {
        const savedSeriesKey = storyKeys.series(identityScope, project.id);
        await cache.cancelQueries({queryKey: savedSeriesKey, exact: true});
        cache.setQueryData(savedSeriesKey, workspace);
      }
      // Chapter planning can edit the story root while a different chapter is open.
      if (!workspace || project.id !== id) await cache.invalidateQueries({queryKey: seriesKey});
      await cache.invalidateQueries({queryKey: storyKeys.library(identityScope)});
    } catch (cause) {
      if (!(cause instanceof CinematicWritingCancelled)) {
        setError((cause as Error).message || t("failed"));
        await Promise.all([query.refetch(), ...(fullStoryOwner === id ? [] : [storyRoot.refetch()])]);
      }
    } finally {
      lock.current = false;
      setBusy(false);
      setActivity(undefined);
    }
  };

  return {query, chapters, manifest, storyRoot, fullStoryOwner, busy, activity, error, setError, run};
}
