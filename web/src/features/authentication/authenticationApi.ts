import { z } from 'zod';
import { apiRequest } from '../../lib/api/apiClient';

export const registrationChallengeSchema = z.object({
  contractVersion: z.literal(1), challengeId: z.string().min(1).max(128),
  expiresAt: z.iso.datetime(), resendAt: z.iso.datetime()
});
const registrationVerificationSchema = z.object({
  contractVersion: z.literal(1), nextAction: z.literal('complete_registration'),
  contextId: z.string().min(1).max(128)
});
const authenticatedResultSchema = z.object({ contractVersion: z.literal(1), nextAction: z.literal('authenticated'), returnPath: z.string().max(1024) });
const loginVerificationSchema = z.discriminatedUnion('nextAction', [
  authenticatedResultSchema,
  z.object({ contractVersion: z.literal(1), nextAction: z.literal('offer_registration'), contextId: z.string().min(1).max(128) }),
  z.object({ contractVersion: z.literal(1), nextAction: z.literal('unavailable') })
]);
const enrollmentIntentSchema = z.discriminatedUnion('nextAction', [
  registrationVerificationSchema,
  z.object({ contractVersion: z.literal(1), nextAction: z.literal('sign_in_existing') })
]);
const registrationResultSchema = z.discriminatedUnion('nextAction', [
  z.object({ contractVersion: z.literal(1), nextAction: z.literal('authenticated'), returnPath: z.string().max(1024) }),
  z.object({ contractVersion: z.literal(1), nextAction: z.literal('sign_in_existing') })
]);
export type RegistrationChallenge = z.infer<typeof registrationChallengeSchema>;
export type RegistrationCompletion = {
  displayName: string; termsAccepted: true; termsVersion: string; privacyVersion: string;
  password?: string; passwordConfirmation?: string;
};
export function requestRegistration(email: string, rememberDevice: boolean, returnPath: string, key: string, signal: AbortSignal) {
  return apiRequest('/api/auth/challenges', { method: 'POST',
    headers: { 'Idempotency-Key': key }, body: { purpose: 'registration', email, rememberDevice, returnPath },
    signal, schema: registrationChallengeSchema });
}
export function verifyRegistration(challengeId: string, code: string, signal: AbortSignal) {
  return apiRequest(`/api/auth/challenges/${encodeURIComponent(challengeId)}/verify`, {
    method: 'POST', body: { code }, signal, schema: registrationVerificationSchema
  });
}
export function completeRegistration(input: RegistrationCompletion, signal: AbortSignal) {
  return apiRequest('/api/auth/register', { method: 'POST', body: input, signal, schema: registrationResultSchema });
}
export function requestPasswordLogin(email: string, password: string, rememberDevice: boolean, returnPath: string, signal: AbortSignal) {
  return apiRequest('/api/auth/login', { method: 'POST', body: { email, password, rememberDevice, returnPath }, signal, schema: authenticatedResultSchema });
}
export function requestLoginCode(email: string, rememberDevice: boolean, returnPath: string, key: string, signal: AbortSignal) {
  return apiRequest('/api/auth/challenges', { method: 'POST', headers: { 'Idempotency-Key': key },
    body: { purpose: 'login', email, rememberDevice, returnPath }, signal, schema: registrationChallengeSchema });
}
export function verifyLoginCode(challengeId: string, code: string, signal: AbortSignal) {
  return apiRequest(`/api/auth/challenges/${encodeURIComponent(challengeId)}/verify`, {
    method: 'POST', body: { code }, signal, schema: loginVerificationSchema
  });
}
export function acceptEnrollmentIntent(signal: AbortSignal) {
  return apiRequest('/api/auth/enrollment-intents', { method: 'POST', body: {}, signal, schema: enrollmentIntentSchema });
}

export type SocialProvider = 'google' | 'facebook';
const socialStartSchema = z.object({ contractVersion: z.literal(1), authorizationUrl: z.url(),
  operationId: z.string().min(1).max(128), expiresAt: z.iso.datetime() });
const socialResultSchema = z.object({ contractVersion: z.literal(1),
  nextAction: z.enum(['authenticated', 'complete_registration', 'verify_email', 'sign_in_existing', 'fresh_sign_in_required', 'reauthenticated', 'unavailable', 'mfa_required']),
  returnPath: z.string().max(1024), rememberDevice: z.boolean(), contextId: z.string().min(1).max(128).optional()
});
export function startSocialLogin(provider: SocialProvider, rememberDevice: boolean, returnPath: string, signal: AbortSignal) {
  return apiRequest(`/api/auth/social/${provider}/start`, { method: 'POST',
    body: { intent: 'login', rememberDevice, returnPath }, signal, schema: socialStartSchema });
}
export function getSocialLoginResult(provider: SocialProvider, signal: AbortSignal) {
  return apiRequest(`/api/auth/social/${provider}/result`, { signal, schema: socialResultSchema });
}
export function requestSocialEmail(provider: SocialProvider, email: string, key: string, signal: AbortSignal) {
  return apiRequest(`/api/auth/social/${provider}/email`, { method: 'POST', headers: { 'Idempotency-Key': key },
    body: { email }, signal, schema: registrationChallengeSchema });
}

export function getFacebookDeletionReceipt(code: string, signal: AbortSignal) {
  return apiRequest(`/api/auth/social/facebook/deletion-status?confirmation_code=${encodeURIComponent(code)}`, {
    signal, schema: z.object({ contractVersion: z.literal(1), status: z.literal('received') })
  });
}

const resetVerificationSchema = z.discriminatedUnion('nextAction', [
  z.object({ contractVersion: z.literal(1), nextAction: z.literal('reset_password'), contextId: z.string().min(1).max(128) }),
  z.object({ contractVersion: z.literal(1), nextAction: z.literal('unavailable') })
]);
const preparedResetSchema = z.object({ contractVersion: z.literal(1), operationId: z.string().min(1).max(128), expiresAt: z.iso.datetime() });
const operationOutcomeSchema = z.object({ contractVersion: z.literal(1), operationId: z.string().min(1).max(128),
  status: z.enum(['pending', 'succeeded', 'failed', 'expired']), nextAction: z.enum(['sign_in', 'fresh_sign_in_required']).nullable() });
export type PreparedReset = z.infer<typeof preparedResetSchema>;
export function requestPasswordReset(email: string, key: string, signal: AbortSignal) {
  return apiRequest('/api/auth/challenges', { method: 'POST', headers: { 'Idempotency-Key': key },
    body: { purpose: 'password_reset', email }, signal, schema: registrationChallengeSchema });
}
export function verifyPasswordReset(challengeId: string, code: string, signal: AbortSignal) {
  return apiRequest(`/api/auth/challenges/${encodeURIComponent(challengeId)}/verify`, {
    method: 'POST', body: { code }, signal, schema: resetVerificationSchema });
}
export function preparePasswordReset(password: string, passwordConfirmation: string, key: string, signal: AbortSignal) {
  return apiRequest('/api/auth/operations/prepare', { method: 'POST', headers: { 'Idempotency-Key': key },
    body: { action: 'password_reset', payload: { password, passwordConfirmation } }, signal, schema: preparedResetSchema });
}
export function commitPasswordReset(operationId: string, password: string, passwordConfirmation: string, key: string, signal: AbortSignal) {
  return apiRequest('/api/auth/password/reset', { method: 'POST', headers: { 'Idempotency-Key': key },
    body: { operationId, password, passwordConfirmation }, signal,
    schema: operationOutcomeSchema.refine(value => value.operationId === operationId) });
}
export function getAuthenticationOperation(operationId: string, signal: AbortSignal) {
  return apiRequest(`/api/auth/operations/${encodeURIComponent(operationId)}`, {
    signal, schema: operationOutcomeSchema.refine(value => value.operationId === operationId) });
}
