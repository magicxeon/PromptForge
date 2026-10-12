// Domain-owned, reviewed migrations are explicitly registered here when approved.
// Importing this registry must not load application startup or execute work.
import { identityMigrations } from '../../server/repositories/identity/identityMigrations.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { identityOperationMigrations } from '../../server/repositories/identity/identityOperationMigrations.js';
import { identityChallengeMigrations } from '../../server/repositories/identity/identityChallengeMigrations.js';
import { identityEmailDeliveryMigrations } from '../../server/repositories/identity/identityEmailDeliveryMigrations.js';
export const migrations = [...identityMigrations(), ...securityAuditMigrations(), ...identityOperationMigrations(), ...identityChallengeMigrations(), ...identityEmailDeliveryMigrations()];
