import configuration from "./comparison-ui.json";

const integer = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isInteger(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
const pageSize = integer(configuration.history.pageSize, 5, 1, 50);
export const comparisonHistoryConfig = {
  pageSize,
  lazyLoad: configuration.history.lazyLoad === true,
  prefetchMarginPx: integer(
    configuration.history.prefetchMarginPx,
    300,
    0,
    1000,
  ),
  maxLoadedSets: integer(
    configuration.history.maxLoadedSets,
    100,
    pageSize,
    500,
  ),
};
