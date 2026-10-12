// Protocol constants are server-owned. No request or token claim may select a URL.
export const GOOGLE_IDENTITY_PROTOCOL = Object.freeze({
  authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  keys: 'https://www.googleapis.com/oauth2/v3/certs',
  issuer: 'https://accounts.google.com',
  timeoutMs: 10000,
  maximumResponseBytes: 262144,
});

export const FACEBOOK_IDENTITY_PROTOCOL = Object.freeze({
  authorization: 'https://www.facebook.com/v26.0/dialog/oauth',
  token: 'https://graph.facebook.com/v26.0/oauth/access_token',
  debug: 'https://graph.facebook.com/v26.0/debug_token',
  profile: 'https://graph.facebook.com/v26.0/me',
  timeoutMs: 10000,
  maximumResponseBytes: 262144,
});
