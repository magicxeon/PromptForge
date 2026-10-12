import type { SocialProvider } from './authenticationApi';

export function redirectToSocialProvider(provider: SocialProvider, address: string) {
  const url = new URL(address);
  const expected = provider === 'google' ? 'accounts.google.com' : 'www.facebook.com';
  const pathname = provider === 'google' ? '/o/oauth2/v2/auth' : '/v26.0/dialog/oauth';
  if (url.protocol !== 'https:' || url.hostname !== expected || url.pathname !== pathname || url.port || url.username || url.password || url.hash)
    throw new Error('Social authorization destination is unavailable.');
  window.location.assign(url.href);
}
