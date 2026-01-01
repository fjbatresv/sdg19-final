import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
export declare const cognitoClient: CognitoIdentityProviderClient;
/**
 * Register a new user and immediately confirm it in the user pool.
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