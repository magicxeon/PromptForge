// Canonical, side-effect-free definitions. Startup checks status; only the
// explicit maintenance command applies this reviewed registry.
import { identityMigrations } from '../identity/identityMigrations.js';
import { securityAuditMigrations } from '../audit/securityAuditMigrations.js';
import { identityOperationMigrations } from '../identity/identityOperationMigrations.js';
import { identityChallengeMigrations } from '../identity/identityChallengeMigrations.js';
import { identityEmailDeliveryMigrations } from '../identity/identityEmailDeliveryMigrations.js';
import { identitySessionMigrations } from '../identity/identitySessionMigrations.js';
import { identityActorMigrations } from '../identity/identityActorMigrations.js';
import { identityEnrollmentMigrations } from '../identity/identityEnrollmentMigrations.js';
import { identityPrimaryMigrations } from '../identity/identityPrimaryMigrations.js';
import { identityOtpLoginMigrations } from '../identity/identityOtpLoginMigrations.js';
import { identityActionMigrations } from '../identity/identityActionMigrations.js';
import { identitySocialMigrations } from '../identity/identitySocialMigrations.js';
import { identityFacebookMigrations } from '../identity/identityFacebookMigrations.js';
export const migrations = [
  ...identityMigrations(), ...securityAuditMigrations(), ...identityOperationMigrations(),
  ...identityChallengeMigrations(), ...identityEmailDeliveryMigrations(), ...identitySessionMigrations(),
  ...identityActorMigrations(), ...identityEnrollmentMigrations(), ...identityPrimaryMigrations(),
  ...identityOtpLoginMigrations(), ...identityActionMigrations(), ...identitySocialMigrations(), ...identityFacebookMigrations(),
];
