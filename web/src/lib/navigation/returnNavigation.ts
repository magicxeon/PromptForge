import type { Location } from 'react-router-dom';
import { getActiveActorId } from '../auth/actorStore';

export type ReturnNavigationState = {
  mpfReturn?: {
    to?: string;
    actorId?: string;
  };
};

export function createReturnNavigationState(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>
) {
  return {
    mpfReturn: {
      to: `${location.pathname}${location.search}${location.hash}`,
      actorId: getActiveActorId()
    }
  };
}

export function isSafeInternalPath(value: string | undefined): value is string {
  return Boolean(value?.startsWith('/') && !value.startsWith('//'));
}
