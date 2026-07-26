import { communityFeaturePolicyService } from './CommunityFeaturePolicyService.js';

const INTERNAL_REQUIRED_FLAGS = Object.freeze([
  'enabled',
  'shareEnabled',
  'exploreEnabled',
  'engagementEnabled',
  'creatorProfilesEnabled',
  'galleryEnabled',
  'moderationEnabled'
]);

export class CommunityLaunchReadinessService {
  constructor({ featurePolicyService = communityFeaturePolicyService } = {}) {
    this.featurePolicyService = featurePolicyService;
  }

  async getReadiness() {
    const flags = await this.featurePolicyService.getPublicFlags();
    const missingInternalFeatures = INTERNAL_REQUIRED_FLAGS.filter(
      key => flags.community?.[key] !== true
    );
    const readyForInternal = missingInternalFeatures.length === 0;
    return {
      schemaVersion: 1,
      exposure: flags.community?.privateBeta === true ? 'private_beta' : 'internal',
      readyForInternal,
      readyForPrivateBeta: readyForInternal && flags.community?.privateBeta === true,
      readyForProduction: false,
      featureState: {
        community: structuredClone(flags.community || {}),
        automaticSimpleModeEnabled: flags.routing?.automaticSimpleModeEnabled === true
      },
      missingInternalFeatures,
      productionBlockers: [
        'production_authentication',
        'durable_database',
        'private_object_storage_and_cdn',
        'payment_operations',
        'terms_privacy_and_ai_disclosure',
        'monitoring_and_incident_response'
      ]
    };
  }
}

export const communityLaunchReadinessService = new CommunityLaunchReadinessService();
