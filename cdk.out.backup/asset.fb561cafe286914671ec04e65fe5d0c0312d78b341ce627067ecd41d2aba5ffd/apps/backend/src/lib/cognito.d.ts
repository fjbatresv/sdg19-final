import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
export declare const cognitoClient: CognitoIdentityProviderClient;
export declare function registerUser(input: {
    clientId: string;
    userPoolId: string;
    email: string;
    password: string;
    name?: string;
}): Promise<void>;
export declare function loginUser(input: {
    clientId: string;
    email: string;
    password: string;
}): Promise<import("@aws-sdk/client-cognito-identity-provider").AuthenticationResultType>;
export declare function refreshUser(input: {
    clientId: string;
    refreshToken: string;
}): Promise<import("@aws-sdk/client-cognito-identity-provider").AuthenticationResultType>;
//# sourceMappingURL=cognito.d.ts.map