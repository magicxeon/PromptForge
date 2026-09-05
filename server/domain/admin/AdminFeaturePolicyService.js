import { adminPolicyService } from './AdminPolicyService.js';

const DEFINITIONS = Object.freeze({
  operationsRead: { env: 'ADMIN_OPERATIONS_READ_ENABLED', defaultEnabled: true, mode: 'active' },
  providerHealthRead: { env: 'ADMIN_PROVIDER_HEALTH_READ_ENABLED', defaultEnabled: true, mode: 'active' },
  contentRead: { env: 'ADMIN_CONTENT_READ_ENABLED', defaultEnabled: true, mode: 'active' },
  traceRead: { env: 'ADMIN_TRACE_READ_ENABLED', defaultEnabled: true, mode: 'active' },
  supportCases: { env: 'SUPPORT_CASES_ENABLED', defaultEnabled: true, mode: 'active' },
  providerRuntimeControl: {
    env: 'ADMIN_PROVIDER_RUNTIME_CONTROL_ENABLED',
    defaultEnabled: environment => (environment.NODE_ENV || 'development') !== 'production',
    mode: 'production_gated',
    prerequisites: ['staff_authentication', 'shared_transactional_storage_for_multi_instance_production']
  },
  runtimeConfigurationDrafts: { env: 'ADMIN_RUNTIME_CONFIGURATION_ENABLED', defaultEnabled: true, mode: 'scaffold' },
  runtimeConfigurationPublish: {
    env: 'ADMIN_RUNTIME_CONFIGURATION_PUBLISH_ENABLED', defaultEnabled: false, mode: 'production_gated',
    prerequisites: ['staff_authentication', 'postgresql', 'atomic_consumer_cutover']
  },
  scheduledConfigurationPublish: {
    env: 'ADMIN_SCHEDULED_CONFIGURATION_PUBLISH_ENABLED', defaultEnabled: false, mode: 'production_gated',
    prerequisites: ['durable_scheduler', 'postgresql', 'staff_authentication']
  },
  generationCommands: {
    env: 'SUPPORT_GENERATION_COMMANDS_ENABLED', defaultEnabled: false, mode: 'production_gated',
    prerequisites: ['owner_generation_command_facade', 'postgresql', 'staff_authentication']
  },
  contentCommands: {
    env: 'ADMIN_CONTENT_COMMANDS_ENABLED', defaultEnabled: false, mode: 'production_gated',
    prerequisites: ['owner_content_command_facades', 'staff_authentication']
  },
  restrictedMediaReveal: {
    env: 'ADMIN_RESTRICTED_MEDIA_REVEAL_ENABLED', defaultEnabled: false, mode: 'production_gated',
    prerequisites: ['step_up_authentication', 'reason_and_case_link', 'reveal_audit']
  },
  financialCommands: {
    env: 'ADMIN_FINANCIAL_COMMANDS_ENABLED', defaultEnabled: false, mode: 'production_gated',
    prerequisites: ['staff_authentication', 'postgresql', 'transactional_ledger', 'approval_policy']
  },
  assetReconciliation: {
    env: 'ADMIN_ASSET_RECONCILIATION_ENABLED', defaultEnabled: false, mode: 'production_gated',
    prerequisites: ['owner_asset_reconciliation_facade', 'durable_audit']
  }
});

export class AdminFeaturePolicyService {
  constructor({ policy = adminPolicyService, environment = process.env } = {}) {
    this.policy = policy;
    this.environment = environment;
  }

  getExposure(actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return {
      generatedAt: new Date().toISOString(),
      environment: this.environment.NODE_ENV || 'development',
      capabilities: Object.fromEntries(Object.entries(DEFINITIONS).map(([id, definition]) => {
        const defaultEnabled = typeof definition.defaultEnabled === 'function'
          ? definition.defaultEnabled(this.environment)
          : definition.defaultEnabled;
        const enabled = readBoolean(this.environment[definition.env], defaultEnabled);
        return [id, {
          id,
          enabled,
          mode: enabled && definition.mode === 'production_gated' ? 'explicit_override' : definition.mode,
          env: definition.env,
          prerequisites: definition.prerequisites || [],
          reason: enabled ? null : `Set ${definition.env}=true only after all prerequisites are satisfied.`
        }];
      }))
    };
  }

  assertEnabled(capabilityId, actorContext) {
    const capability = this.getExposure(actorContext).capabilities[capabilityId];
    if (!capability) throw Object.assign(new Error('Unknown Admin capability.'), { code: 'admin_capability_unknown', statusCode: 404 });
    if (!capability.enabled) {
      throw Object.assign(new Error(capability.reason), {
        code: 'admin_capability_disabled', statusCode: 503, details: capability
      });
    }
    return capability;
  }
}

function readBoolean(value, fallback) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

export const adminFeaturePolicyService = new AdminFeaturePolicyService();
