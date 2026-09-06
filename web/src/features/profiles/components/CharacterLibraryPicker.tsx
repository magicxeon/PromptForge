import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterPickerDialog, type CharacterPickerItem } from '../../../components/profiles/CharacterPickerDialog';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { getCharacter, listCharacters, listOwnedCharacters } from '../api/profileApi';
import type { CharacterSummary } from '../schemas/profileSchemas';
import { readCharacterPickerRecents, rememberCharacterPick } from '../characterPickerRecents';

export function CharacterLibraryPicker({ open, onOpenChange, current, onSelect, unavailableReason }: {
  open: boolean; onOpenChange: (value: boolean) => void; current: CharacterSummary | null;
  onSelect: (item: CharacterSummary) => Promise<void>; unavailableReason: (item: CharacterSummary) => string | undefined;
}) {
  const { actor } = useActor();
  return <CharacterLibraryPickerSession key={`${actor?.userId || 'loading'}:${open}`} actorId={actor?.userId || ''}
    open={open} onOpenChange={onOpenChange} current={current} onSelect={onSelect} unavailableReason={unavailableReason} />;
}
function CharacterLibraryPickerSession({ actorId, open, onOpenChange, current, onSelect, unavailableReason }: {
  actorId: string; open: boolean; onOpenChange: (value: boolean) => void; current: CharacterSummary | null;
  onSelect: (item: CharacterSummary) => Promise<void>; unavailableReason: (item: CharacterSummary) => string | undefined;
}) {
  const { t } = useTranslation('react-ui');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'mine' | 'community'>('mine');
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [selected, setSelected] = useState<CharacterSummary | null>(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search.trim()); setCursors([null]); }, 250); return () => clearTimeout(timer); }, [search]);
  const page = useQuery({ queryKey: ['characters', actorId, 'picker', scope, query, cursors.at(-1)],
    queryFn: () => scope === 'mine' ? listOwnedCharacters(cursors.at(-1), { q: query, limit: '24' }) : listCharacters({ q: query, limit: '24', reusePolicy: 'public_reusable' }, cursors.at(-1)),
    enabled: open && Boolean(actorId), staleTime: 30_000 });
  const recentIds = open ? readCharacterPickerRecents(actorId) : [];
  const recentQueries = useQueries({ queries: recentIds.map(id => ({ queryKey: ['character', actorId, id], queryFn: () => getCharacter(id), enabled: open && Boolean(actorId), staleTime: 30_000, retry: false })) });
  const recent = recentQueries.flatMap(result => result.data && !unavailableReason(result.data) ? [result.data] : []);
  const items = page.data?.items || [];
  const projection = (item: CharacterSummary): CharacterPickerItem => ({ id: item.id, name: item.displayName,
    image: item.faceThumbnailUrl || item.thumbnailUrl || item.imageUrl, unavailableReason: unavailableReason(item) });
  async function confirm() {
    if (!selected || pending || unavailableReason(selected)) return;
    setPending(true); setError(null);
    try {
      await onSelect(selected);
      if (getActiveActorId() !== actorId) return;
      rememberCharacterPick(actorId, selected.id); onOpenChange(false);
    } catch { setError(t('ui.characterPicker.failed')); }
    finally { setPending(false); }
  }
  return <CharacterPickerDialog open={open} onOpenChange={onOpenChange} items={items.map(projection)} recent={recent.map(projection)} current={selected ? projection(selected) : null}
    selectedId={selected?.id || null} onSelect={id => setSelected([...items, ...recent, ...(selected ? [selected] : [])].find(item => item.id === id) || null)}
    search={search} onSearch={setSearch} scope={scope} onScope={value => { setScope(value); setCursors([null]); }}
    loading={page.isLoading || query !== search.trim()} error={error || (page.isError ? t('ui.characterPicker.failed') : null)} onRetry={() => { setError(null); void page.refetch(); }}
    pending={pending} onConfirm={() => void confirm()} page={cursors.length - 1} hasMore={Boolean(page.data?.hasMore && page.data.nextCursor)}
    onPrevious={() => setCursors(value => value.slice(0, -1))} onNext={() => { if (page.data?.nextCursor) setCursors(value => [...value, page.data!.nextCursor!]); }} />;
}
