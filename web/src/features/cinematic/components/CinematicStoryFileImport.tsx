import { FileText, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';

export type StoryImportPolicy = {
  extensions: Array<'.md' | '.txt'>;
  maximumBytes: number;
  fullStoryThresholdCharacters: number;
};
export type StoryFile = { fileName: string; content: string };

export async function readStoryFile(file: File, policy: StoryImportPolicy, maximumCharacters: number): Promise<StoryFile> {
  if (!policy.extensions.some(extension => file.name.toLowerCase().endsWith(extension))) throw new Error('type');
  if (file.size > policy.maximumBytes) throw new Error('size');
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
  let content: string;
  try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim(); }
  catch { throw new Error('encoding'); }
  if (!content) throw new Error('empty');
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(content)) throw new Error('encoding');
  if (content.length > maximumCharacters) throw new Error('length');
  return { fileName: file.name, content };
}

export function CinematicStoryFileImport({ policy, briefLimit, maximumCharacters, disabled, replacing = false, onImport }: {
  policy?: StoryImportPolicy;
  briefLimit: number;
  maximumCharacters: number;
  disabled: boolean;
  replacing?: boolean;
  onImport: (file: StoryFile, destination: 'draft' | 'full-story') => Promise<void>;
}) {
  const { t } = useTranslation('cinematic');
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<StoryFile | null>(null);
  const [destination, setDestination] = useState<'draft' | 'full-story'>('draft');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  async function selectFile(selected?: File) {
    if (!selected || !policy) return;
    setBusy(true); setError(''); setApplied(false); setFile(null);
    try {
      const next = await readStoryFile(selected, policy, maximumCharacters);
      setFile(next);
      setDestination(next.content.length > Math.min(briefLimit, policy.fullStoryThresholdCharacters) ? 'full-story' : 'draft');
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : 'read';
      setError(t(`cinematic.storyImport.error.${['type', 'size', 'encoding', 'empty', 'length'].includes(code) ? code : 'read'}`, {
        limit: maximumCharacters, size: Math.floor(policy.maximumBytes / 1024)
      }));
    } finally { setBusy(false); }
  }

  async function apply() {
    if (!file || busy || disabled || (destination === 'draft' && file.content.length > briefLimit)) return;
    setBusy(true); setError('');
    try { await onImport(file, destination); setFile(null); setApplied(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.storyImport.error.read')); }
    finally { setBusy(false); }
  }

  return <section className="cinematic-story-import" aria-label={t('cinematic.storyImport.title')}>
    <div className="cinematic-story-import__toolbar">
      <span>.md / .txt</span>
      <input ref={input} type="file" accept=".md,.txt" hidden aria-label={t('cinematic.storyImport.upload')}
        disabled={disabled || busy || !policy} onChange={event => { void selectFile(event.target.files?.[0]); event.target.value = ''; }} />
      <Button type="button" icon={busy ? <ProcessingSpinner className="size-4" /> : <Upload />} disabled={disabled || busy || !policy}
        onClick={() => input.current?.click()}>{t(replacing ? 'cinematic.storyImport.replaceFile' : 'cinematic.storyImport.upload')}</Button>
    </div>
    {error ? <p role="alert" className="cinematic-story-import__error">{error}</p> : null}
    {applied ? <p role="status">{t('cinematic.storyImport.applied')}</p> : null}
    {file ? <div className="cinematic-story-import__preview">
      <header><FileText aria-hidden="true" /><div><strong>{file.fileName}</strong><small>{t('cinematic.storyImport.count', { count: file.content.length })}</small></div>
        <Button type="button" size="icon" icon={<X />} title={t('cinematic.storyImport.cancel')} aria-label={t('cinematic.storyImport.cancel')}
          disabled={busy || disabled} onClick={() => { setFile(null); setError(''); }} />
      </header>
      <div className="cinematic-new-project__segments" role="group" aria-label={t('cinematic.storyImport.destination')}>
        {(['draft', 'full-story'] as const).map(value => <button key={value} type="button" aria-pressed={destination === value}
          className={destination === value ? 'is-selected' : ''}
          disabled={busy || disabled || (value === 'draft' && file.content.length > briefLimit)} onClick={() => setDestination(value)}>
          {t(`cinematic.storyImport.${value}`)}
        </button>)}
      </div>
      <textarea rows={5} readOnly value={file.content} aria-label={t('cinematic.storyImport.preview')} />
      <footer><span>{t(`cinematic.storyImport.${destination}Hint`)}</span>
        <Button type="button" variant="primary" icon={busy ? <ProcessingSpinner className="size-4" /> : <Upload />}
          disabled={busy || disabled} onClick={() => void apply()}>{t(`cinematic.storyImport.${replacing ? 'replace' : 'apply'}.${destination}`)}</Button>
      </footer>
    </div> : null}
  </section>;
}
