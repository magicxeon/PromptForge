import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { apiMediaBlob, useActor, ProcessingSpinner } from "../../lib/canonical";
export function usePrivateImage(src?: string) {
  const { identityScope, isLoading } = useActor();
  const [attempt, retry] = useState(0);
  const [state, setState] = useState({ source: "", url: "", error: false });
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    let active = true;
    setState({ source: src || "", url: "", error: false });
    if (src && !isLoading)
      void apiMediaBlob(src, controller.signal)
        .then((blob) => {
          if (!active) return;
          objectUrl = URL.createObjectURL(blob);
          setState({ source: src, url: objectUrl, error: false });
        })
        .catch(() => {
          if (active && !controller.signal.aborted)
            setState({ source: src, url: "", error: true });
        });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, identityScope, isLoading, attempt]);
  return {
    url: !isLoading && state.source === src ? state.url : "",
    error: !isLoading && state.source === src && state.error,
    retry: () => retry((n) => n + 1),
  };
}
export function MediaImage({
  src,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string }) {
  const media = usePrivateImage(src);
  const { t } = useTranslation();
  if (media.error)
    return (
      <span role="img" aria-label={t("mediaError")}>
        —
      </span>
    );
  if (!media.url) return <ProcessingSpinner className="small-spinner" />;
  return <img {...props} src={media.url} />;
}
