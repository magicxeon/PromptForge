import { IdentitySocialService } from './IdentitySocialService.js';
// Existing Google callers retain the same public contract and policy owner.
export class IdentityGoogleService extends IdentitySocialService {
  constructor(options) { super({ ...options, provider: 'google' }); }
}
