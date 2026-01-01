/**
 * Normalizes runtime strings, returning undefined for empty values.
 */
const normalize = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * Resolves the API base URL from runtime configuration.
 */
export const resolveApiBaseUrl = (fallback: string) => {
  const runtime = (globalThis as { __env?: { apiBaseUrl?: string } }).__env;
  return normalize(runtime?.apiBaseUrl) ?? fallback;
};
