import { Boxes } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils/cn';

const providerIds = new Set(['gemini', 'openai', 'xai', 'modelark', 'meta-muse']);

export function ProviderMark({ providerId, className }: { providerId: string; className?: string }) {
  const normalizedId = providerId.trim().toLowerCase();

  return (
    <span
      className={cn('provider-mark', className)}
      data-provider-mark={normalizedId || 'unknown'}
      aria-hidden="true"
    >
      {providerIds.has(normalizedId) ? <ProviderShape key={normalizedId} id={normalizedId} /> : <Boxes />}
    </span>
  );
}

function ProviderShape({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  const src = `/assets/providers/${id}.png`;
  if (failed) return <Boxes />;
  return <><img className="provider-mark__probe" src={src} alt="" onError={() => setFailed(true)} />
    <span className="provider-mark__shape" style={{ maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")` }} /></>;
}
