/**
 * Read an environment variable or throw if missing.
 *
 * Notes: empty strings are treated as missing because `!value` is used.
 * Example: NAME="" will throw the same as undefined.
 */
export declare function requireEnv(name: string): string;
//# sourceMappingURL=env.d.ts.map