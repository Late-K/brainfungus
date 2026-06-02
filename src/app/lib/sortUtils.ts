export function safeTimestamp(value?: string): number {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function compareByDate(
  aTimestamp: number,
  bTimestamp: number,
  sortBy: "newest" | "oldest",
): number {
  return sortBy === "newest"
    ? bTimestamp - aTimestamp
    : aTimestamp - bTimestamp;
}

export function compareByKnownCount(
  aKnownCount: number,
  bKnownCount: number,
  sortBy: "mostKnown" | "leastKnown",
): number {
  return sortBy === "mostKnown"
    ? bKnownCount - aKnownCount
    : aKnownCount - bKnownCount;
}
