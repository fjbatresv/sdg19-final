import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export const cognitoClient = new CognitoIdentityProviderClient({});

export async function registerUser(input: {
  clientId: string;
  userPoolId: string;
  email: string;
  password: string;
  name?: string;
}) {
  await cognitoClient.send(
    new SignUpCommand({
      ClientId: input.clientId,
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: 'email', Value: input.email },
        ...(input.name ? [{ Name: 'name', Value: input.name }] : []),
      ],
    })
  );

  await cognitoClient.send(
    new AdminConfirmSignUpCommand({
      UserPoolId: input.userPoolId,
      Username: input.email,
    })
  );
}

export async function loginUser(input: {
  clientId: string;
  email: string;
  password: string;
}) {
  const result = await cognitoClient.send(
    new InitiateAuthCommand({
      ClientId: input.clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: input.email,
        PASSWORD: input.password,
      },
    })
  );

  return result.AuthenticationResult ?? {};
}

export async function refreshUser(input: {
  clientId: string;
  refreshToken: string;
}) {
  const result = await cognitoClient.send(
    new InitiateAuthCommand({
      ClientId: input.clientId,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: {
        REFRESH_TOKEN: input.refreshToken,
      },
    })
  );

  return result.AuthenticationResult ?? {};
}
