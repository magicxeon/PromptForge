import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY_PATH = path.resolve(
  __dirname,
  '../../config/fashion-direction-packs.json'
);

export class FashionDirectionResolver {
  constructor({ policyPath = DEFAULT_POLICY_PATH } = {}) {
    this.policyPath = policyPath;
    this.cachedPolicy = null;
  }

  getPolicy() {
    if (this.cachedPolicy) return this.cachedPolicy;
    const policy = JSON.parse(fs.readFileSync(this.policyPath, 'utf8'));
    if (!policy?.policyVersion || !policy?.pose || !policy?.environment) {
      throw policyError(
        'fashion_direction_policy_invalid',
        'Fashion direction policy is incomplete.',
        500
      );
    }
    this.cachedPolicy = policy;
    return policy;
  }

  resolve({ poseDirection, environmentDirection } = {}) {
    const policy = this.getPolicy();
    const poseId = policy.pose[poseDirection] ? poseDirection : 'template_pose';
    const environmentId = policy.environment[environmentDirection]
      ? environmentDirection
      : 'template_environment';
    return {
      policyVersion: policy.policyVersion,
      pose: {
        id: poseId,
        ...policy.pose[poseId]
      },
      environment: {
        id: environmentId,
        ...policy.environment[environmentId]
      }
    };
  }
}

export const fashionDirectionResolver = new FashionDirectionResolver();

function policyError(code, message, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}
