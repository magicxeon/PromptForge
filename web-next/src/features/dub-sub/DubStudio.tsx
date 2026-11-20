import { lazy, Suspense } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useMatch,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProcessingSpinner, useActor } from "../../lib/canonical";
import { useQueryClient } from "@tanstack/react-query";
import { Projects } from "./Projects";
import "./studio.css";
const Editor = lazy(() => import("./Editor"));
const VoiceStudio = lazy(async () => {
  const [
    { VoiceStudioRoute },
    { default: i18n },
    { default: en },
    { default: th },
  ] = await Promise.all([
    import("../../../../web/src/features/voice-studio/routes/VoiceStudioRoute"),
    import("../../app/i18n"),
    import("../../../../client/i18n/locales/en/voice-studio.json"),
    import("../../../../client/i18n/locales/th/voice-studio.json"),
  ]);
  for (const [language, catalog] of [
    ["en", en],
    ["th", th],
  ] as const) {
    i18n.addResourceBundle(
      language,
      "voice-studio",
      Object.fromEntries(
        Object.entries(catalog).map(([k, v]) => [
          k,
          typeof v === "string"
            ? v.replace(/(?<!\{)\{(\w+)\}(?!\})/g, "{{$1}}")
            : v,
        ]),
      ),
    );
  }
  return { default: VoiceStudioRoute };
});
export default function DubStudio() {
  const editingProject = !!useMatch("/dub-sub/projects/:id");
  const { t } = useTranslation("dub");
  const navigate = useNavigate();
  const { identityScope } = useActor();
  const queries = useQueryClient();
  const [params] = useSearchParams();
  const project = params.get("project");
  const editorPath =
    project && /^[\w-]+$/.test(project) ? "/dub-sub/projects/" + project : null;
  const resume = {
    cueId: params.get("cue"),
    language: params.get("language"),
    timeMs: Number(params.get("ms")),
    modelId: params.get("model") || "",
    voice: params.get("voice") || "",
    panel: "voice",
    scope: identityScope,
  };
  function selectForCue(voice: string) {
    if (!editorPath) return;
    void queries.invalidateQueries({
      queryKey: ["dubVoice", identityScope, "characters"],
    });
    void queries.invalidateQueries({
      queryKey: ["dubVoice", identityScope, "voices"],
    });
    navigate(editorPath, { state: { resume: { ...resume, voice } } });
  }
  return (
    <main className="dub-studio">
      {!editingProject && <nav aria-label={t("workspace")}>
        <NavLink end to="/dub-sub">
          {t("projects")}
        </NavLink>
        <NavLink
          to={editorPath ? "/dub-sub/voice?" + params : "/dub-sub/voice"}
        >
          Voice Studio
        </NavLink>
        {editorPath && (
          <Link to={editorPath} state={{ resume }}>
            ‹ {t("backEditor")}
          </Link>
        )}
      </nav>}
      <Suspense fallback={<ProcessingSpinner />}>
        <Routes>
          <Route index element={<Projects />} />
          <Route path="projects/:id" element={<Editor />} />
          <Route
            path="voice"
            element={
              <VoiceStudio
                picker={
                  editorPath
                    ? {
                        useLabel: t("useForCue"),
                        onVoice: (choice) =>
                          selectForCue(
                            (choice.kind === "prebuilt" ? "preset" : "custom") +
                              "/" +
                              choice.id,
                          ),
                        onCharacter: (id) => selectForCue("character/" + id),
                      }
                    : undefined
                }
              />
            }
          />
        </Routes>
      </Suspense>
    </main>
  );
}
