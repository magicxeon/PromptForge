import { useTranslation } from "react-i18next";
import { Aperture } from "lucide-react";
import { useActor, ProcessingSpinner } from "../lib/canonical";
import { ImageWorkspace } from "../features/playground/routes/ImageWorkspace";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ComparisonWorkspace } from "../features/comparisons/routes/ComparisonWorkspace";
import { VideoWorkspace } from "../features/playground/routes/VideoWorkspace";
export const legacyUrl = (path = "/playground") =>
  `${location.protocol}//${location.hostname}:6500${path}`;
export function App() {
  const { actor, identityScope, isLoading, error, refresh } = useActor();
  const { t, i18n } = useTranslation();
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/image">
          <Aperture size={25} /> momelo <span>Playground</span>
        </Link>
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
          <Routes key={identityScope}>
            <Route path="/" element={<Navigate to="/image" replace />} />
            <Route path="/image" element={<ImageWorkspace />} />
            <Route path="/comparison" element={<ComparisonWorkspace />} />
            <Route path="/video" element={<VideoWorkspace />} />
            <Route path="*" element={<Navigate to="/image" replace />} />
          </Routes>
        </div>
      )}
    </div>
  );
}
