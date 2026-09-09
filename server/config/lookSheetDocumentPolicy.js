export function isLookSheetDocumentEnabled(env = process.env) {
  return env.LOOK_SHEET_DOCUMENT_ENABLED === 'true'
    || (env.LOOK_SHEET_DOCUMENT_ENABLED !== 'false' && env.NODE_ENV !== 'production');
}
