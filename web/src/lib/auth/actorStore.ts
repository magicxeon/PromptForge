const STORAGE_KEY = 'mpf_active_mock_user_id';
const DEFAULT_ACTOR_ID = 'usr_demo';

export function getActiveActorId() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_ACTOR_ID;
}

export function persistActiveActorId(actorId: string) {
  localStorage.setItem(STORAGE_KEY, actorId);
}
