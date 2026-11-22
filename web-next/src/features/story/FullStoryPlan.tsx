import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useActor } from "../../lib/canonical";
import type { CinematicProject } from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {
  confirmCinematicFullStoryRevision, generateCinematicFullStoryChapters,
  proposeCinematicChapterOutline, reviewCinematicChapterOutline,
} from "../../../../web/src/features/cinematic/api/cinematicApi";
import { applyCinematicChapterProposal, discardCinematicChapterProposal } from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import { chapterOutlineIsStale } from "../../../../web/src/features/cinematic/components/CinematicChapterOutline";

type Props = {
  project: CinematicProject;
  run: (job: () => Promise<CinematicProject | void>) => Promise<void>;
  goChapter: (id: string) => void;
};

export function FullStoryPlan({ project, run, goChapter }: Props) {
  const { t } = useTranslation("storyPlan");
  const { identityScope } = useActor();
  const cache = useQueryClient();
  const revision = project.fullStoryVersions.find(v => v.id === project.activeFullStoryVersionId);
  if (!revision) return null;
  const confirmed = project.confirmedFullStoryVersionId === revision.id;
  const plan = project.chapterOutline;
  const current = plan && !chapterOutlineIsStale(project);
  const pending = project.chapterProposals.find(p => p.scope === "all" && p.status === "pending_review");
  const applied = [...project.chapterProposals].reverse().find(p => p.status === "applied" && p.scope === "all");
  async function generateOrReview(action: "generate" | "apply" | "discard") {
    await run(async () => {
      if (action !== "generate" && !pending) return;
      const result = action === "generate"
        ? await generateCinematicFullStoryChapters(project.id, project.version)
        : await (action === "apply" ? applyCinematicChapterProposal : discardCinematicChapterProposal)(project.id, pending!.id);
      cache.setQueryData(["story-series", identityScope, project.id], result.workspace);
      return result.project;
    });
  }
  return <section className="story-panel" aria-label={t("heading")}>
    <h2>{t("heading")}</h2>
    {!confirmed && <button onClick={() => void run(() => confirmCinematicFullStoryRevision(project.id, project.version, revision.id))}>
      {t("confirmRevision",{version:revision.version})}</button>}
    {confirmed && (!current || !plan) && !pending && <>
      {plan && <p>{t("outdated")}</p>}
      <button onClick={() => void run(() => proposeCinematicChapterOutline(project.id, project.version))}>{t("proposeOutline")}</button>
    </>}
    {confirmed && current && plan && !pending && <>
      <ol>{plan.chapters.map((row,i) => <li key={i}><strong>{row.title}</strong><p>{row.synopsis}</p></li>)}</ol>
      {plan.status === "proposed" ? <div className="story-actions">
        {(["approve","discard"] as const).map(action => <button key={action} onClick={() => void run(() =>
          reviewCinematicChapterOutline(project.id,{expectedVersion:project.version, outlineId:plan.id, action}))}>{t(action+"Outline")}</button>)}
      </div> : <button onClick={() => void generateOrReview("generate")}>{t("writeChapters")}</button>}
    </>}
    {pending && <>
      <h3>{t("reviewChapters")}</h3>
      {pending.chapters.map(ch => <details key={ch.order}><summary>{ch.order}. {ch.title}</summary><p style={{whiteSpace:"pre-wrap"}}>{ch.story}</p></details>)}
      {pending.warnings.map(message => <p key={message}>{message}</p>)}
      <div className="story-actions">
        <button disabled={!confirmed || pending.sourceFullStoryRevisionId !== revision.id} onClick={() => void generateOrReview("apply")}>{t("applyChapters")}</button>
        <button onClick={() => void generateOrReview("discard")}>{t("discardChapters")}</button>
      </div>
    </>}
    {applied?.appliedProjectIds?.map((id,i) => <button key={id} onClick={() => goChapter(id)}>
      {t("openChapter",{name:applied.chapters[i]?.title || i+1})}</button>)}
  </section>;
}
