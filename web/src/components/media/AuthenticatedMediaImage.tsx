import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { apiMediaBlob } from '../../lib/api/apiClient';
import { useActor } from '../../lib/auth/ActorProvider';

type AuthenticatedMediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
  fallback?: ReactNode;
  renderResolved?: (objectUrl: string) => ReactNode;
};

export function AuthenticatedMediaImage({
  src,
  fallback = null,
  renderResolved,
  ...imageProps
}: AuthenticatedMediaImageProps) {
  const { actor } = useActor();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let nextObjectUrl: string | null = null;
    setObjectUrl(null);
    setFailed(false);

    if (src) {
      void apiMediaBlob(src, controller.signal)
        .then(blob => {
          nextObjectUrl = URL.createObjectURL(blob);
          setObjectUrl(nextObjectUrl);
        })
        .catch(error => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setFailed(true);
        });
    }

    return () => {
      controller.abort();
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [actor?.userId, src]);

  if (!src || failed) return <>{fallback}</>;
  if (!objectUrl) {
    return <span className="authenticated-media-image__loading" aria-hidden="true" />;
  }
  if (renderResolved) return <>{renderResolved(objectUrl)}</>;
  return <img {...imageProps} src={objectUrl} />;
}
