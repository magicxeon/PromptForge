import { IdentitySocialService } from './IdentitySocialService.js';
export class IdentityFacebookService extends IdentitySocialService {
  constructor(options) { super({ ...options, provider: 'facebook' }); }
}
