import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getOwnCreatorProfileLocator } from '../../../lib/auth/creatorProfileLocator';

export function MyProfileRoute() {
  const { actor } = useActor();
  const { profileTab } = useParams();
  const profile = useQuery({
    queryKey: ['own-creator-profile-route', actor?.userId || 'loading'],
    queryFn: getOwnCreatorProfileLocator,
    enabled: Boolean(actor)
  });

  if (profile.isLoading) return <LoadingState label="Loading profile" />;
  if (profile.isError || !profile.data) {
    return (
      <ErrorState
        title="Profile unavailable"
        description={profile.error?.message || 'The active profile could not be loaded.'}
      />
    );
  }

  return <Navigate to={routeBuilders.profile(profile.data.id, profileTab)} replace />;
}

export function MyCharactersRoute() {
  return <Navigate to="/me/characters" replace />;
}

export function ProfileFallbackRoute() {
  return <Navigate to={routePaths.explore} replace />;
}
