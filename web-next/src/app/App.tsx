import { useTranslation } from "react-i18next";
import { Aperture } from "lucide-react";
import { lazy, Suspense } from "react";
import { WorkspaceMenu } from "./WorkspaceMenu";
import { WorkspaceConfig } from "../lib/workspaceConfig";
const DubStudio = lazy(() => import("../features/dub-sub/DubStudio"));
const StoryStudio = lazy(() => import("../features/story/StoryStudio"));
import { useActor, ProcessingSpinner } from "../lib/canonical";
const ImageWorkspace = lazy(() => import("../features/playground/routes/ImageWorkspace").then(module => ({ default: module.ImageWorkspace })));
import { Link, Navigate, Route, Routes } from "react-router-dom";
const ComparisonWorkspace = lazy(() => import("../features/comparisons/routes/ComparisonWorkspace").then(module => ({default: module.ComparisonWorkspace})));
const VideoWorkspace = lazy(() => import("../features/playground/routes/VideoWorkspace").then(module => ({default: module.VideoWorkspace})));
export const legacyUrl = (path = "/playground") =>
  `${location.protocol}//${location.hostname}:6500${path}`;
export function App() {
  const { actor, identityScope, isLoading, error, refresh } = useActor();
  const { t, i18n } = useTranslation();
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/image">
          <Aperture size={25} /> momelo
        </Link>
        <WorkspaceMenu />
        <div className="header-actions">
          <select
            aria-label={t("language")}
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
          >
            <option value="th">ไทย</option>
            <option value="en">English</option>
          </select>
          <span className="actor-name">
            {actor?.displayName || actor?.username || ""}
          </span>
        </div>
      </header>
      {isLoading ? (
        <div className="identity-status" role="status">
          <ProcessingSpinner /> {t("connecting")}
        </div>
      ) : null}
      {error || !actor ? (
        !isLoading && (
          <main className="session-message">
            <h1>{t("connectTitle")}</h1>
            <p>{t("connectHelp")}</p>
            <button onClick={() => void refresh()}>{t("retry")}</button>
            <a
              className="button"
              href={legacyUrl("/login")}
              target="_blank"
              rel="noreferrer"
            >
              {t("login")}
            </a>
          </main>
        )
      ) : (
        <div hidden={isLoading} inert={isLoading || undefined}>
          <WorkspaceConfig identityScope={identityScope} key={identityScope}><Routes>
            <Route path="/" element={<Navigate to="/image" replace />} />
            <Route path="/image" element={<Suspense fallback={<ProcessingSpinner />}><ImageWorkspace /></Suspense>} />
            <Route path="/comparison" element={<Suspense fallback={<ProcessingSpinner />}><ComparisonWorkspace /></Suspense>} />
            <Route path="/video" element={<Suspense fallback={<ProcessingSpinner />}><VideoWorkspace /></Suspense>} />
            <Route path="/story/*" element={<Suspense fallback={<ProcessingSpinner />}><StoryStudio /></Suspense>} />
            <Route path="/dub-sub/*" element={<Suspense fallback={<ProcessingSpinner />}><DubStudio /></Suspense>} />
            <Route path="*" element={<Navigate to="/image" replace />} />
          </Routes></WorkspaceConfig>
        </div>
      )}
    </div>
  );
}
