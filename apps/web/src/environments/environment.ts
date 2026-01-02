/**
 * Default environment configuration for local development.
 */
import { resolveApiBaseUrl } from './runtime';

/**
 * Environment settings used by the app at runtime.
 */
export const environment = {
  apiBaseUrl: resolveApiBaseUrl('http://localhost:3000'),
  frontendDomain: 'sdg19final.link',
};
