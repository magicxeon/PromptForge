import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useMatch, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function WorkspaceMenu() {
  const { t } = useTranslation();
  const inStudio = !!useMatch("/dub-sub/*");
  const { key } = useLocation();
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [key]);
  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !nav.current?.contains(event.target)) setOpen(false);
    };
    const dismissOnResize = new ResizeObserver(() => {
      if (!trigger.current?.getClientRects().length) setOpen(false);
    });
    if (nav.current) dismissOnResize.observe(nav.current);
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    return () => {
      dismissOnResize.disconnect();
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
    };
  }, [open]);

  return (
    <nav ref={nav} className="workspace-menu" aria-label={t("primaryMenu")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}>
      <button ref={trigger} type="button" className="workspace-menu-toggle"
        aria-label={t("primaryMenu")} aria-expanded={open} aria-controls="workspace-links"
        onClick={() => setOpen(!open)}>
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>
      <div id="workspace-links" className="workspace-links" data-open={open}>
        <Link to="/image" aria-current={!inStudio ? "location" : undefined}
          onClick={() => setOpen(false)}>{t("playgroundName")}</Link>
        <Link to="/dub-sub" aria-current={inStudio ? "location" : undefined}
          onClick={() => setOpen(false)}>{t("dubStudioName")}</Link>
      </div>
    </nav>
  );
}
