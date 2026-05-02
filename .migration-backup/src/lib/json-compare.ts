export function normalizeJsonForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonForComparison);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeJsonForComparison(record[key]);
        return acc;
      }, {});
  }

  return value;
}

export function areJsonEqual(a: unknown, b: unknown): boolean {
  return (
    JSON.stringify(normalizeJsonForComparison(a)) ===
    JSON.stringify(normalizeJsonForComparison(b))
  );
}
