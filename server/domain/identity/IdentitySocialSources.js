// Enrollment's private collaborator dispatches to the verified source owner.
// No client provider hint chooses authority; each repository scopes its lookup.
export class IdentitySocialSources {
  constructor(sources) { this.sources = Object.freeze([...sources]); }
  async owner(transaction, contextId) {
    let found;
    for (const source of this.sources) {
      const row = await source.enrollmentSource(contextId, transaction);
      if (!row) continue;
      if (found) throw new Error('Ambiguous enrollment source.');
      found = { source, row };
    }
    return found;
  }
  async enrollmentSource(contextId, transaction) { return (await this.owner(transaction, contextId))?.row ?? null; }
  async lockEnrollment(transaction, contextId) { const found = await this.owner(transaction, contextId); if (found) await found.source.lockEnrollment(transaction, contextId); }
  async bindEnrollment(transaction, contextId, accountId) { const found = await this.owner(transaction, contextId); if (found) await found.source.bindEnrollment(transaction, contextId, accountId); }
}
