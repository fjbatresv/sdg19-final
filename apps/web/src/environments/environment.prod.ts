/**
 * Production environment configuration.
 */
import { resolveApiBaseUrl } from './runtime';

export const environment = {
  apiBaseUrl: resolveApiBaseUrl('https://finalapi.javierba3.com'),
};
