// Frozen fixture policy from AUTH-011. This module neither reads .env nor
// activates authentication or real delivery.
export const challengePolicy = Object.freeze({
  digits: 6,
  lifetimeMs: 300000,
  maximumFailures: 5,
  resendMs: 60000,
  maximumRateRows: 10000,
  cleanupBatch: 50,
});

export const challengeRatePolicy = Object.freeze({
  send_target_hour: Object.freeze({ limit: 5, windowMs: 3600000 }),
  send_target_day: Object.freeze({ limit: 10, windowMs: 86400000 }),
  send_cooldown: Object.freeze({ limit: 1, windowMs: 60000 }),
  send_source_hour: Object.freeze({ limit: 20, windowMs: 3600000 }),
  send_global_hour: Object.freeze({ limit: 100, windowMs: 3600000 }),
  verify_target_short: Object.freeze({ limit: 10, windowMs: 900000 }),
  verify_target_hour: Object.freeze({ limit: 30, windowMs: 3600000 }),
  verify_account_short: Object.freeze({ limit: 10, windowMs: 900000 }),
  verify_account_hour: Object.freeze({ limit: 30, windowMs: 3600000 }),
  verify_source_short: Object.freeze({ limit: 60, windowMs: 900000 }),
  verify_source_hour: Object.freeze({ limit: 200, windowMs: 3600000 }),
  verify_global_hour: Object.freeze({ limit: 1000, windowMs: 3600000 }),
});

export const challengeContextPurposes = Object.freeze({
  registration: 'registration',
  login: 'login',
  password_reset: 'password_reset',
  email_change_new: 'email_change_new',
  link_email: 'link',
  reauthentication: 'reauthentication',
});
export const challengeNextActions = Object.freeze({
  registration: Object.freeze(['complete_registration', 'sign_in_existing', 'unavailable']),
  login: Object.freeze(['authenticate', 'mfa_required', 'offer_registration', 'unavailable']),
  password_reset: Object.freeze(['reset_password', 'unavailable']),
  email_change_new: Object.freeze(['confirm_email_change', 'unavailable']),
  link_email: Object.freeze(['complete_link', 'unavailable']),
  reauthentication: Object.freeze(['reauthenticated', 'mfa_required', 'unavailable']),
});
