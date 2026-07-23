/**
 * Client Credit Balance Badge Component
 * Manages rendering available/reserved balance and recharge (+) action
 */
(function() {
  class CreditBalanceBadge {
    constructor() {
      this.availableElement = document.getElementById('credits-value');
      this.reservedElement = document.getElementById('credits-reserved-value');
      this.rechargeBtn = document.getElementById('btn-recharge');
      this.init();
    }

    init() {
      if (this.rechargeBtn) {
        this.rechargeBtn.addEventListener('click', () => this.handleRecharge());
      }
      this.refresh();
    }

    async refresh() {
      try {
        const data = await window.CreditApi.fetchAccount();
        const acc = data.account || {};
        if (this.availableElement) {
          this.availableElement.textContent = String(acc.availableCredits ?? 0);
        }
        if (this.reservedElement) {
          const reserved = Number(acc.reservedCredits || 0);
          this.reservedElement.hidden = reserved === 0;
          this.reservedElement.textContent = reserved ? `(${reserved} reserved)` : '';
        }
      } catch (err) {
        console.warn('[CreditBadge] Refresh failed:', err.message);
      }
    }

    async handleRecharge() {
      try {
        if (this.rechargeBtn) this.rechargeBtn.disabled = true;
        await window.CreditApi.mockGrant(10);
        await this.refresh();
      } catch (err) {
        alert('Grant failed: ' + err.message);
      } finally {
        if (this.rechargeBtn) this.rechargeBtn.disabled = false;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.creditBalanceBadge = new CreditBalanceBadge();
  });
})();
