import { CollectionError } from '../domain/collections/CollectionManager.js';
import { ComparisonError } from '../repositories/comparisons/ComparisonRepository.js';

export function sendCollectionError(res, error) {
  if (error instanceof CollectionError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
  }
  console.error('[Collections] Unexpected error:', error);
  return res.status(500).json({
    error: {
      code: 'collection_internal_error',
      message: 'Collection operation failed.'
    }
  });
}

export function sendComparisonError(res, error) {
  if (error instanceof ComparisonError || error.statusCode) {
    return res.status(error.statusCode || 400).json({
      error: {
        code: error.code || 'comparison_request_failed',
        message: error.message
      }
    });
  }
  console.error('[Comparison] Unexpected error:', error);
  return res.status(500).json({
    error: {
      code: 'comparison_internal_error',
      message: 'Comparison operation failed.'
    }
  });
}
