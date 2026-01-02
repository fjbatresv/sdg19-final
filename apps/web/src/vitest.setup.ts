/**
 * Global test shim for Angular's $localize runtime.
 */
const globalWithLocalize = globalThis as unknown as {
  $localize?: (strings: TemplateStringsArray, ...values: unknown[]) => string;
};

if (!globalWithLocalize.$localize) {
  globalWithLocalize.$localize = (strings, ...values) =>
    String.raw({ raw: strings }, ...values);
}
