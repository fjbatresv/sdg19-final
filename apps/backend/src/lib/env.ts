/**
 * Read an environment variable or throw if missing.
 *
 * Notes: empty strings are treated as missing because `!value` is used.
 * Example: NAME="" will throw the same as undefined.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}
