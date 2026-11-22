import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes, useMatch } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProcessingSpinner } from "../../lib/canonical";
import { Projects } from "./Projects";
import "./studio.css";

const Editor = lazy(() => import("./Editor"));
const Setup = lazy(() => import("./DubbingVoiceSetup"));
const AudioScripts = lazy(() => import("./audio-scripts/AudioScripts"));
const AudioScriptEditor = lazy(() => import("./audio-scripts/AudioScriptEditor"));

export default function DubStudio() {
  const { t } = useTranslation("dub");
  const inEditor = useMatch("/dub-sub/projects/:id/*");
  return (
    <main className="dub-studio">
      {!inEditor && <nav aria-label={t("workspace")}>
        <NavLink end to="/dub-sub">{t("projects")}</NavLink>
        <NavLink to="/dub-sub/audio-scripts">{t("audioScripts:title")}</NavLink>
        <NavLink to="/dub-sub/setup/voices">{t("casting.setup")}</NavLink>
      </nav>}
      <Suspense fallback={<ProcessingSpinner />}>
        <Routes>
          <Route index element={<Projects />} />
          <Route path="audio-scripts" element={<AudioScripts />} />
          <Route path="audio-scripts/:id/*" element={<AudioScriptEditor />} />
          <Route path="projects/:id/*" element={<Editor />} />
          <Route path="setup/voices" element={<Setup />} />
          <Route path="voice" element={<Navigate replace to="/dub-sub" />} />
        </Routes>
      </Suspense>
    </main>
  );
}
