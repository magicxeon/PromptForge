import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY_PATH = path.resolve(__dirname, '../../config/template-pose-proxy-policy.json');

export class TemplatePoseProxyPolicyService {
  constructor({ policyPath = DEFAULT_POLICY_PATH } = {}) {
    this.policyPath = policyPath;
    this.cachedPolicy = null;
  }

  getPolicy() {
    if (this.cachedPolicy) return this.cachedPolicy;
    const configuredPolicy = JSON.parse(fs.readFileSync(this.policyPath, 'utf8'));
    const promptProfile = (configuredPolicy.promptProfiles || []).find(profile =>
      profile.providerId === configuredPolicy.providerId
      && profile.modelId === configuredPolicy.modelId
    );
    const policy = promptProfile
      ? {
          ...configuredPolicy,
          prompt: promptProfile.prompt,
          processorStrategyVersion: promptProfile.processorStrategyVersion,
          outputRepresentation: promptProfile.outputRepresentation
        }
      : {
          ...configuredPolicy,
          outputRepresentation: configuredPolicy.outputRepresentation || 'matte_mannequin'
        };
    if (!policy?.policyVersion
      || policy.operationPurpose !== 'template_pose_proxy_prepare'
      || !policy.prompt
      || !policy.providerId
      || !policy.modelId
      || (policy.automaticFallbacks || []).length) {
      const error = new Error('Template Pose Proxy policy is invalid.');
      error.code = 'template_pose_proxy_policy_invalid';
      error.statusCode = 500;
      throw error;
    }
    this.cachedPolicy = policy;
    return policy;
  }
}

export const templatePoseProxyPolicyService = new TemplatePoseProxyPolicyService();
