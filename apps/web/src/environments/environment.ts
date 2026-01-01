/**
 * Default environment configuration for local development.
 */
import { resolveApiBaseUrl } from './runtime';

export const environment = {
  apiBaseUrl: resolveApiBaseUrl('http://localhost:3000'),
};
