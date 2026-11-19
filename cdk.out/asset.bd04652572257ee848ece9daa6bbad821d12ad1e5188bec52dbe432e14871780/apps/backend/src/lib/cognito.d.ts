import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
export declare const cognitoClient: CognitoIdentityProviderClient;
/**
 * Register a new user and immediately confirm it in the user pool.
 *
 * Security implications: this auto-confirms users and bypasses email/SMS
 * verification. Restrict usage to development/testing or gated admin flows.
 * For production, require verification or protect the endpoint with strict
 * authorization to avoid account takeover and abuse.
 */
export declare function registerUser(input: {
    clientId: string;
    userPoolId: string;
    email: string;
    password: string;
    name?: string;
}): Promise<void>;
/**
 * Perform user/password auth and return the Cognito auth result.
 *
 * Auth result fields:
 * - AccessToken (string): JWT for API authorization.
 * - IdToken (string): JWT with user identity claims.
 * - RefreshToken (string, optional): long-lived token to refresh sessions.
 * - TokenType (string): typically "Bearer".
 * - ExpiresIn (number): access token TTL in seconds.
 * - NewDeviceMetadata (object, optional): device key/group metadata.
 * - $metadata (object, optional): SDK response metadata (requestId, status).
 */
export declare function loginUser(input: {
    clientId: string;
    email: string;
    password: string;
}): Promise<import("@aws-sdk/client-cognito-identity-provider").AuthenticationResultType>;
/**
 * Refresh tokens using the Cognito refresh token flow.
 */
export declare function refreshUser(input: {
    clientId: string;
    refreshToken: string;
}): Promise<import("@aws-sdk/client-cognito-identity-provider").AuthenticationResultType>;
//# sourceMappingURL=cognito.d.ts.map