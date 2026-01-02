/**
 * JWT payload fields used for session expiry.
 */
export type JwtPayload = {
  exp?: number;
};

/**
 * Decodes the JWT payload section to extract claims.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    const decoded = atob(payload);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Calculates absolute expiration time from token claims or TTL.
 */
export function getExpiresAt(idToken?: string, expiresIn?: number) {
  if (idToken) {
    const payload = decodeJwtPayload(idToken);
    if (payload?.exp) {
      return payload.exp * 1000;
    }
  }
  if (expiresIn) {
    return Date.now() + expiresIn * 1000;
  }
  return undefined;
}
