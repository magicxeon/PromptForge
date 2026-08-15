export function downloadStudioConfig(payload: Record<string, unknown>) {
  const url = URL.createObjectURL(new Blob(
    [JSON.stringify({ schemaVersion: 2, ...payload }, null, 2)],
    { type: 'application/json' }
  ));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `momelo-studio-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function lightweightStudioReferences<K extends string>(
  references: Partial<Record<K, string>>
) {
  return Object.fromEntries(
    Object.entries(references).filter(([, value]) =>
      typeof value === 'string' && value.length > 0 && !value.startsWith('data:')
    )
  );
}
