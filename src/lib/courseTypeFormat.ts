/**
 * Course type naming/label utilities.
 *
 * Goal:
 * - Always render exactly one `P.` prefix (no `P.P`)
 * - Allow matching `Sportif` <-> `P.SPORTIF` (same base)
 */

export const normalizeCourseTypeBaseName = (input: string): string => {
  const raw = (input ?? '').trim();
  if (!raw) return '';

  // Normalize separators, keep dots.
  const upper = raw.toUpperCase();
  // Remove any repeated leading `P.` prefixes.
  const base = upper.replace(/^(P\.)+/, '').trim();
  return base;
};

/** Returns a display label like `P.SPORTIF` (never `P.P...`). */
export const formatCourseTypeLabel = (input: string): string => {
  const base = normalizeCourseTypeBaseName(input);
  if (!base) return '';
  return `P.${base}`;
};

/**
 * Normalizes a folder/name for storage.
 * We intentionally keep the "P." convention but collapse duplicates.
 */
export const normalizeCourseTypeNameForStorage = (input: string): string => {
  const base = normalizeCourseTypeBaseName(input);
  if (!base) return '';
  return `P.${base}`;
};
