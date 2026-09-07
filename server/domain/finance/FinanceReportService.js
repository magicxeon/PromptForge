import { createHash } from 'node:crypto';

export const FINANCE_TIMEZONE = 'Asia/Bangkok';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: FINANCE_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
});
export const fingerprint = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const financeError = (code, statusCode = 400) =>
  Object.assign(new Error(code), { code, statusCode });

export function periodOf(value) {
  const date = new Date(value);
  if (value == null || !Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}`;
}

export function buildFinanceReport(
  source,
  query = {},
  now = new Date().toISOString(),
) {
  const year = Number(query.year || periodOf(now).slice(0, 4));
  const month = Number(query.month || 0);
  const page = Number(query.page || 1);
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > Number(periodOf(now).slice(0, 4)) ||
    !Number.isInteger(month) ||
    month < 0 ||
    month > 12 ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000
  )
    throw financeError('finance_filter_invalid');
  const asOf = query.asOf || now;
  if (
    !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(asOf) ||
    !Number.isFinite(Date.parse(asOf)) ||
    Date.parse(asOf) > Date.parse(now)
  )
    throw financeError('finance_as_of_invalid');
  for (const key of ['providerId', 'modelId']) {
    if (
      query[key] != null &&
      (typeof query[key] !== 'string' || query[key].length > 200)
    ) {
      throw financeError('finance_filter_invalid');
    }
  }
  const revision = fingerprint(source);
  if (query.revision && query.revision !== revision)
    throw financeError('finance_snapshot_changed', 409);
  const seen = new Map();
  let invalidCount = 0;
  let unallocatedCount = 0;
  const rows = [];
  for (const entry of source.entries) {
    if (
      !entry ||
      typeof entry.ledgerEntryId !== 'string' || !entry.ledgerEntryId ||
      typeof entry.operationType !== 'string' || !entry.operationType ||
      !['string', 'number'].includes(typeof entry.createdAt) ||
      ['ledgerEntryId', 'operationType', 'providerId', 'modelId', 'relatedJobId', 'reservationId', 'estimateId', 'pricingPolicyVersion']
        .some(key => entry[key] != null && (typeof entry[key] !== 'string' || entry[key].length > 500)) ||
      !periodOf(entry.createdAt) ||
      !Number.isSafeInteger(entry.amountCredits) ||
      entry.amountCredits < 0
    ) {
      invalidCount++;
      continue;
    }
    const previous = seen.get(entry.ledgerEntryId);
    if (previous) {
      if (fingerprint(previous) !== fingerprint(entry)) invalidCount++;
      continue;
    }
    seen.set(entry.ledgerEntryId, entry);
    const period = periodOf(entry.createdAt);
    if (
      !period.startsWith(`${year}-`) ||
      new Date(entry.createdAt).getTime() > Date.parse(asOf)
    )
      continue;
    if (!entry.providerId || !entry.modelId) unallocatedCount++;
    if (
      (query.providerId && entry.providerId !== query.providerId) ||
      (query.modelId && entry.modelId !== query.modelId)
    )
      continue;
    rows.push({ ...entry, createdAt: new Date(entry.createdAt).toISOString(), period });
  }
  const available = source.available && invalidCount === 0;
  const periods = Array.from({ length: 12 }, (_, index) => {
    const period = `${year}-${String(index + 1).padStart(2, '0')}`;
    const events = rows.filter((row) => row.period === period);
    const future = period > periodOf(asOf);
    const sum = (operations) => {
      const amount = events
        .filter((row) => operations.includes(row.operationType))
        .reduce((total, row) => total + row.amountCredits, 0);
      return available && !future && Number.isSafeInteger(amount)
        ? amount
        : null;
    };
    return {
      period,
      status: future ? 'future' : available ? 'available' : 'incomplete',
      capturedCredits: sum(['capture', 'capture_legacy']),
      returnedCredits: sum(['refund', 'refund_legacy']),
      eventCount: events.length,
      cashReceived: null,
      supplierPayments: null,
      usageCost: null,
      profit: null,
      closingBalance: null,
    };
  });
  const selectedPeriods = month
    ? periods.filter((row) =>
        row.period.endsWith(`-${String(month).padStart(2, '0')}`),
      )
    : periods;
  const total = (key) => {
    const applicable = selectedPeriods.filter((row) => row.status !== 'future');
    if (!applicable.length || applicable.some((row) => row[key] === null))
      return null;
    const sum = applicable.reduce((value, row) => value + row[key], 0);
    return Number.isSafeInteger(sum) ? sum : null;
  };
  const detail = rows
    .filter(
      (row) =>
        !month || row.period.endsWith(`-${String(month).padStart(2, '0')}`),
    )
    .sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        a.ledgerEntryId.localeCompare(b.ledgerEntryId),
    );
  return {
    asOf,
    revision,
    timezone: FINANCE_TIMEZONE,
    year,
    month,
    page,
    pageSize: 50,
    sourceStatus: available ? 'available' : 'incomplete',
    invalidCount,
    unallocatedCount,
    totals: {
      capturedCredits: total('capturedCredits'),
      returnedCredits: total('returnedCredits'),
      eventCount: detail.length,
    },
    periods,
    events: detail.slice((page - 1) * 50, page * 50),
    hasMore: page * 50 < detail.length,
    sources: {
      credits: source.available ? 'available' : 'unavailable',
      usageCosts: 'unavailable',
      payments: 'unavailable',
      supplierFunding: 'unavailable',
      internalAttribution: 'unavailable',
    },
  };
}
