import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { providerControlApplicationService } from '../admin-configuration/ProviderControlApplicationService.js';
import { videoCapabilityRegistry } from '../generation/VideoCapabilityRegistry.js';
import { adminConfigurationService } from '../admin-configuration/AdminConfigurationService.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { buildFinanceInventory } from './FinanceInventoryService.js';
import { buildFinanceReport, financeError } from './FinanceReportService.js';

export class FinanceApplicationService {
  constructor({
    credits = creditApplicationService,
    controls = providerControlApplicationService,
    video = videoCapabilityRegistry,
    configuration = adminConfigurationService,
    policy = adminPolicyService,
    environment = process.env,
    now = () => new Date().toISOString(),
  } = {}) {
    Object.assign(this, {
      credits,
      controls,
      video,
      configuration,
      policy,
      environment,
      now,
    });
  }

  assertAccess(actorContext) {
    const actor = this.policy.assertCanAccessBackoffice(actorContext);
    if (actor.role !== 'admin')
      throw financeError('finance_access_forbidden', 403);
    if ((this.environment.NODE_ENV || 'development') === 'production') {
      throw financeError('finance_trusted_identity_required', 503);
    }
    return actor;
  }

  async inventory(actor) {
    this.assertAccess(actor);
    return buildFinanceInventory(
      await this.controls.list(actor),
      await this.credits.pricingPolicyService.loadPolicy(),
      this.video.load(),
    );
  }

  async report(query, actor) {
    this.assertAccess(actor);
    let source;
    try {
      source = await this.credits.getFinanceLedger();
    } catch {
      source = { available: false, entries: [] };
    }
    return buildFinanceReport(source, query, this.now());
  }

  async drafts(actor) {
    this.assertAccess(actor);
    const data = await this.configuration.list(actor);
    return {
      publicationAvailable: false,
      reason: 'finance_publication_prerequisites',
      revisions: data.revisions
        .filter((item) =>
          ['finance_provider_cost', 'finance_supplier_agreement'].includes(
            item.scope,
          ),
        )
        .slice(0, 100),
    };
  }

  async createDraft(input, actor, request) {
    this.assertAccess(actor);
    if (
      !['finance_provider_cost', 'finance_supplier_agreement'].includes(
        input?.scope,
      )
    ) {
      throw financeError('finance_scope_invalid');
    }
    const inventory = await this.inventory(actor);
    if (input.values?.baselineRevision !== inventory.revision)
      throw financeError('finance_snapshot_changed', 409);
    const row = inventory.rows.find(
      (item) => item.id === input.values?.modelKey,
    );
    if (!row) throw financeError('finance_model_invalid');
    return this.configuration.createDraft(
      {
        scope: input.scope,
        values: {
          ...input.values,
          providerId: row.providerId,
          modelId: row.modelId,
          retailPolicyVersion: inventory.retailPolicyVersion,
        },
      },
      actor,
      request,
    );
  }
}

export const financeApplicationService = new FinanceApplicationService();
