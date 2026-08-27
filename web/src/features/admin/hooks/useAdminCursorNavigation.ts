import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useAdminCursorNavigation() {
  const [params, setParams] = useSearchParams();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const cursor = params.get('cursor');

  function updateFilters(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    next.delete('cursor');
    setCursorStack([]);
    setParams(next, { replace: true });
  }

  function next(nextCursor?: string | null) {
    if (!nextCursor) return;
    setCursorStack(current => [...current, cursor || '']);
    const nextParams = new URLSearchParams(params);
    nextParams.set('cursor', nextCursor);
    setParams(nextParams);
  }

  function previous() {
    const previousCursor = cursorStack.at(-1);
    if (previousCursor === undefined) return;
    const nextParams = new URLSearchParams(params);
    previousCursor ? nextParams.set('cursor', previousCursor) : nextParams.delete('cursor');
    setCursorStack(current => current.slice(0, -1));
    setParams(nextParams);
  }

  return { params, cursor, canPrevious: cursorStack.length > 0, updateFilters, next, previous };
}
