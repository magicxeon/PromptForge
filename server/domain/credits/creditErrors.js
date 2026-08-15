export class CreditDomainError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'CreditDomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

export function createCreditError(code, message, statusCode = 400, details = {}) {
  return new CreditDomainError(code, message, statusCode, details);
}

export const CREDIT_ERROR_CODES = {
  ACCOUNT_NOT_FOUND: 'credit_account_not_found',
  ACCOUNT_INACTIVE: 'credit_account_inactive',
  INSUFFICIENT: 'credit_insufficient',
  PRICING_UNAVAILABLE: 'credit_pricing_unavailable',
  ESTIMATE_NOT_FOUND: 'credit_estimate_not_found',
  ESTIMATE_EXPIRED: 'credit_estimate_expired',
  ESTIMATE_STALE: 'credit_estimate_stale',
  RESERVATION_NOT_FOUND: 'credit_reservation_not_found',
  RESERVATION_CONFLICT: 'credit_reservation_conflict',
  OPERATION_ALREADY_SETTLED: 'credit_operation_already_settled',
  MOCK_GRANT_FORBIDDEN: 'credit_mock_grant_forbidden',
  ADJUSTMENT_INVALID: 'credit_adjustment_invalid',
  ADJUSTMENT_FORBIDDEN: 'credit_adjustment_forbidden'
};
