import { useState, type ReactNode } from 'react';
import { AuthenticatedMediaImage } from './AuthenticatedMediaImage';
import { useActor } from '../../lib/auth/ActorProvider';

export type DisplayMediaSource = { src: string; fit: 'cover' | 'contain' };

export function DisplayMediaImage({ sources, alt, fallback = null }: {
  sources: DisplayMediaSource[]; alt: string; fallback?: ReactNode;
}) {
  const { actor } = useActor();
  return <DisplayMediaAttempt key={`${actor?.userId}:${JSON.stringify(sources)}`} sources={sources.slice(0, 4)} alt={alt} fallback={fallback} />;
}

function DisplayMediaAttempt({ sources, alt, fallback }: { sources: DisplayMediaSource[]; alt: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const [source, ...rest] = sources;
  if (!source) return <>{fallback}</>;
  const next = <DisplayMediaAttempt key={rest[0]?.src || 'empty'} sources={rest} alt={alt} fallback={fallback} />;
  if (failed) return next;
  return <AuthenticatedMediaImage src={source.src} alt={alt} style={{ objectFit: source.fit, objectPosition: 'center' }}
    onError={() => setFailed(true)} fallback={next} />;
}
