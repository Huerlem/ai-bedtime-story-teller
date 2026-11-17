// Stable display order for a family's child profiles: the order they were added
// (oldest first), then name, then id. Firestore returns equality queries in
// document-ID order, which is random and made profiles swap places between loads.

function toMillis(value) {
  if (value == null) return Number.POSITIVE_INFINITY;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

const nameOf = (c) => String(c.displayName || c.name || '').toLocaleLowerCase('en-GB');

export function sortChildren(children) {
  return [...(children || [])].sort((a, b) =>
    (toMillis(a.createdAt) - toMillis(b.createdAt))
    || nameOf(a).localeCompare(nameOf(b), 'en-GB')
    || String(a.id).localeCompare(String(b.id)));
}
