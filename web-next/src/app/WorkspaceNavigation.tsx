import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Film, ImageIcon, Layers2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function WorkspaceNavigation({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <nav className="workspace-nav" aria-label="Playground">
      <div className="media-tabs">
        <NavLink
          to="/image"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <ImageIcon size={17} />
          {t("image")}
        </NavLink>
        <NavLink
          to="/comparison"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Layers2 size={17} />
          {t("comparison")}
        </NavLink>
        <NavLink
          to="/video"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Film size={17} />
          {t("video")}
        </NavLink>
      </div>
      {children}
    </nav>
  );
}
