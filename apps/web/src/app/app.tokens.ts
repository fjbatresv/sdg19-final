import { InjectionToken } from '@angular/core';

/**
 * Base URL for the backend API (injected from app config).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
