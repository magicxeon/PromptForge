import { adminConfigurationRepository } from '../../repositories/admin-configuration/AdminConfigurationRepository.js';

// Credits reads immutable active policy through this Admin Configuration boundary.
export class PricingConfigurationService {
  constructor({ repository = adminConfigurationRepository } = {}) {
    this.repository = repository;
  }
  getActivePricing() {
    return this.repository.getActivePricing();
  }
}

export const pricingConfigurationService = new PricingConfigurationService();
