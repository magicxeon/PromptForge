import {
  Clock3,
  Coins,
  FileImage,
  Maximize2,
  Ratio,
  TriangleAlert
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type GenerationResultMetadataProps = {
  status?: string | null;
  generationDuration?: string | number | null;
  width?: number | null;
  height?: number | null;
  requestedAspectRatio?: string | null;
  actualCredit?: number | null;
  estimatedCredit?: number | null;
  mimeType?: string | null;
};

type RatioDetails = {
  label: string;
  value: number;
};

const COMMON_RATIOS: RatioDetails[] = [
  { label: '9:16', value: 9 / 16 },
  { label: '2:3', value: 2 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '4:5', value: 4 / 5 },
  { label: '1:1', value: 1 },
  { label: '5:4', value: 5 / 4 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '21:9', value: 21 / 9 }
];

const RATIO_ROUNDING_TOLERANCE = 0.015;

export function GenerationResultMetadata({
  status,
  generationDuration,
  width,
  height,
  requestedAspectRatio,
  actualCredit,
  estimatedCredit,
  mimeType
}: GenerationResultMetadataProps) {
  const { t } = useTranslation('comparisons');
  const duration = formatDuration(generationDuration);
  const dimensions = normalizedDimensions(width, height);
  const deliveredRatio = dimensions
    ? describeRatio(dimensions.width, dimensions.height)
    : null;
  const requestedRatio = parseRatio(requestedAspectRatio);
  const ratioMismatch = Boolean(
    deliveredRatio
    && requestedRatio
    && relativeDifference(deliveredRatio.value, requestedRatio.value) > RATIO_ROUNDING_TOLERANCE
  );
  const credit = selectCredit(status, actualCredit, estimatedCredit);
  const outputFormat = formatMimeType(mimeType);

  const values = [duration, dimensions, deliveredRatio, credit, outputFormat];
  if (values.every(value => value === null)) return null;

  return (
    <div
      className="generation-result-metadata"
      aria-label={t('comparisons.viewer.generationDetails')}
    >
      {duration ? (
        <MetadataItem
          icon={<Clock3 />}
          label={t('comparisons.viewer.generationDuration', { value: duration })}
          value={duration}
        />
      ) : null}
      {dimensions ? (
        <MetadataItem
          icon={<Maximize2 />}
          label={t('comparisons.viewer.dimensions', {
            width: dimensions.width,
            height: dimensions.height
          })}
          value={`${dimensions.width} x ${dimensions.height}`}
        />
      ) : null}
      {deliveredRatio ? (
        <MetadataItem
          className={ratioMismatch ? 'is-warning' : undefined}
          icon={ratioMismatch ? <TriangleAlert /> : <Ratio />}
          label={ratioMismatch
            ? t('comparisons.viewer.aspectRatioMismatch', {
                actual: deliveredRatio.label,
                requested: requestedAspectRatio
              })
            : t('comparisons.viewer.aspectRatio', {
                value: deliveredRatio.label,
                requested: requestedAspectRatio || deliveredRatio.label
              })}
          value={deliveredRatio.label}
        />
      ) : null}
      {credit ? (
        <MetadataItem
          icon={<Coins />}
          label={credit.estimated
            ? t('comparisons.viewer.estimatedCredits', { value: credit.value })
            : t('comparisons.viewer.actualCredits', { value: credit.value })}
          value={`${credit.estimated ? '~' : ''}${formatCredit(credit.value)}`}
        />
      ) : null}
      {outputFormat ? (
        <MetadataItem
          icon={<FileImage />}
          label={t('comparisons.viewer.fileFormat', { value: outputFormat })}
          value={outputFormat}
        />
      ) : null}
    </div>
  );
}

function MetadataItem({
  className,
  icon,
  label,
  value
}: {
  className?: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span
      className={`generation-result-metadata__item${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
    >
      {icon}
      <span aria-hidden="true">{value}</span>
    </span>
  );
}

function normalizedDimensions(width?: number | null, height?: number | null) {
  const normalizedWidth = Number(width);
  const normalizedHeight = Number(height);
  if (!Number.isFinite(normalizedWidth) || !Number.isFinite(normalizedHeight)) return null;
  if (normalizedWidth <= 0 || normalizedHeight <= 0) return null;
  return {
    width: Math.round(normalizedWidth),
    height: Math.round(normalizedHeight)
  };
}

function formatDuration(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return /(?:ms|s)$/i.test(normalized) ? normalized : `${normalized}s`;
}

function describeRatio(width: number, height: number): RatioDetails {
  const value = width / height;
  const common = COMMON_RATIOS.reduce((closest, candidate) => (
    relativeDifference(value, candidate.value) < relativeDifference(value, closest.value)
      ? candidate
      : closest
  ));
  if (relativeDifference(value, common.value) <= RATIO_ROUNDING_TOLERANCE) {
    return common;
  }
  const divisor = greatestCommonDivisor(width, height);
  return {
    label: `${Math.round(width / divisor)}:${Math.round(height / divisor)}`,
    value
  };
}

function parseRatio(value?: string | null): RatioDetails | null {
  if (!value || value === 'auto') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { label: value, value: width / height };
}

function relativeDifference(left: number, right: number) {
  return Math.abs(left - right) / right;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function selectCredit(
  status?: string | null,
  actualCredit?: number | null,
  estimatedCredit?: number | null
) {
  const actual = finiteNonNegative(actualCredit);
  const estimate = finiteNonNegative(estimatedCredit);
  const terminal = ['completed', 'failed', 'cancelled'].includes(status || '');
  if (actual !== null && (terminal || actual > 0)) {
    return { value: actual, estimated: false };
  }
  if (estimate !== null) return { value: estimate, estimated: true };
  if (actual !== null) return { value: actual, estimated: false };
  return null;
}

function finiteNonNegative(value?: number | null) {
  if (value === null || value === undefined) return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null;
}

function formatCredit(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.0+$/, '');
}

function formatMimeType(value?: string | null) {
  if (!value || !/^(?:image|video)\/[a-z0-9.+-]+$/i.test(value)) return null;
  const subtype = value.split('/')[1]?.toUpperCase();
  if (!subtype) return null;
  if (subtype === 'JPEG') return 'JPG';
  return subtype.replace('+XML', '');
}
