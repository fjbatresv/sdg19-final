/**
 * Production environment configuration.
 */
import { resolveApiBaseUrl } from './runtime';

/**
 * Environment settings used by the app in production.
 */
export const environment = {
  apiBaseUrl: resolveApiBaseUrl('https://finalapi.javierba3.com'),
  frontendDomain: 'sdg19final.link',
};
