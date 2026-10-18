import { z } from 'zod';

export const actorSchema = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  role: z.string(),
  activeCreatorProfileId: z.string().nullable().optional(),
  isMockActor: z.boolean().optional(),
  authProvider: z.string().optional(),
  authMode: z.enum(['session', 'development_bypass']).optional(),
  roles: z.array(z.enum(['customer', 'admin', 'support'])).optional(),
  accountStatus: z.enum(['active', 'suspended', 'disabled', 'closed']).optional(),
  securityVersion: z.number().int().positive().optional()
});

export const currentActorSchema = actorSchema.nullable();
const legalUrl = z.url().max(2048).refine(value => {
  const url = new URL(value);
  return !url.username && !url.password && !url.hash && !url.search
    && (url.protocol === 'https:' || url.protocol === 'http:' && url.hostname === '127.0.0.1');
});
export const authConfigSchema = z.object({
  contractVersion: z.literal(1),
  authMode: z.enum(['session', 'development_bypass']),
  methods: z.object({ password: z.boolean(), emailOtp: z.boolean(), google: z.boolean(), facebook: z.boolean() }),
  csrfToken: z.string().min(1).max(2048).nullable(),
  development: z.object({ liveGeneration: z.boolean() }).optional(),
  policy: z.object({
    otpDigits: z.literal(6), otpExpiresSeconds: z.number().int().positive(),
    resendSeconds: z.number().int().nonnegative(), passwordMinLength: z.number().int().positive(),
    passwordMaxLength: z.number().int().positive()
  }),
  legal: z.object({ termsVersion: z.string().nullable(), privacyVersion: z.string().nullable(),
    termsUrl: legalUrl.nullable().optional(), privacyUrl: legalUrl.nullable().optional() })
}).refine(value => value.csrfToken !== null || value.authMode === 'session' && !Object.values(value.methods).some(Boolean), {
  message: 'An available authentication method requires browser CSRF binding.'
});

export const mockUsersResponseSchema = z.object({
  enabled: z.boolean(),
  users: z.array(z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    role: z.string(),
    activeCreatorProfileId: z.string().nullable().optional(),
    featureFlags: z.array(z.string()).optional()
  }))
});

export type Actor = z.infer<typeof actorSchema>;
export type AuthConfig = z.infer<typeof authConfigSchema>;
export type AuthMode = AuthConfig['authMode'];
export type MockUser = z.infer<typeof mockUsersResponseSchema>['users'][number];
