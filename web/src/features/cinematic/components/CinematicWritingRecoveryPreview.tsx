import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readableArtifact(result: unknown) {
  const root = object(result);
  const documents: string[] = [];
  function collect(value: unknown, depth = 0) {
    if (depth > 5 || documents.length >= 120) return;
    const item = object(value);
    const text = ['title', 'name', 'displayName', 'storyRole', 'synopsis', 'story', 'storyBrief', 'fullStory', 'content',
      'enhancedStoryBrief', 'creativeDirection', 'environmentPrompt', 'wardrobeDirection', 'shotDocument', 'direction', 'rationale']
      .map(key => item[key]).filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));
    if (text.length) documents.push(text.join('\n'));
    for (const key of ['chapters', 'scenes', 'shots', 'characters', 'recommendedRoles']) {
      if (Array.isArray(item[key])) for (const child of item[key].slice(0,120)) collect(child, depth + 1);
    }
    for (const key of ['proposal', 'plan', 'scene', 'chapterOutline']) if (item[key]) collect(item[key], depth + 1);
  }
  collect(root);
  if (root.project) collect(object(root.project).chapterOutline);
  return documents.join('\n\n').slice(0,500000);
}

export function CinematicWritingRecoveryPreview({ result, operationId }: { result: unknown; operationId: string }) {
  const { t } = useTranslation('cinematic');
  const text = readableArtifact(result);
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${operationId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return <section className="mb-4 min-w-0" aria-label={t('cinematic.writingBilling.storedResult')}>
    <div className="mb-2 flex items-center justify-between gap-2"><h3 className="m-0 text-sm">{t('cinematic.writingBilling.storedResult')}</h3>
      <Button size="icon" icon={<Download aria-hidden="true" />} disabled={result == null} title={t('cinematic.writingBilling.downloadResult')}
        aria-label={t('cinematic.writingBilling.downloadResult')} onClick={download} /></div>
    <pre className="m-0 max-h-[30dvh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6">{text || t('cinematic.writingBilling.resultUnavailable')}</pre>
  </section>;
}
