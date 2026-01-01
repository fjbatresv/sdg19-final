export {};

declare global {
  interface Window {
    __env?: {
      apiBaseUrl?: string;
    };
  }

  const __env: {
    apiBaseUrl?: string;
  } | undefined;
}
