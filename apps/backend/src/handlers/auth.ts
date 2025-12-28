import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { jsonResponse } from '../lib/response';
import { requireEnv } from '../lib/env';
import { loginUser, refreshUser, registerUser } from '../lib/cognito';

function parseBody(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return null;
  }
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

function getSubFromIdToken(idToken?: string) {
  if (!idToken) {
    return undefined;
  }
  const parts = idToken.split('.');
  if (parts.length < 2) {
    return undefined;
  }
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    const json = JSON.parse(decoded);
    return json.sub as string | undefined;
  } catch {
    return undefined;
  }
}

export async function registerHandler(event: APIGatewayProxyEventV2) {
  const body = parseBody(event);
  if (!body?.email || !body?.password) {
    return jsonResponse(400, { message: 'email y password son requeridos' });
  }

  const userPoolId = requireEnv('USER_POOL_ID');
  const clientId = requireEnv('USER_POOL_CLIENT_ID');

  try {
    await registerUser({
      clientId,
      userPoolId,
      email: body.email,
      password: body.password,
      name: body.name,
    });

    const auth = await loginUser({
      clientId,
      email: body.email,
      password: body.password,
    });

    return jsonResponse(201, {
      userId: getSubFromIdToken(auth.IdToken) ?? body.email,
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error registrando usuario';
    return jsonResponse(400, { message });
  }
}

export async function loginHandler(event: APIGatewayProxyEventV2) {
  const body = parseBody(event);
  if (!body?.email || !body?.password) {
    return jsonResponse(400, { message: 'email y password son requeridos' });
  }

  const clientId = requireEnv('USER_POOL_CLIENT_ID');

  try {
    const auth = await loginUser({
      clientId,
      email: body.email,
      password: body.password,
    });

    if (!auth.AccessToken || !auth.IdToken) {
      return jsonResponse(401, { message: 'Credenciales invalidas' });
    }

    return jsonResponse(200, {
      userId: getSubFromIdToken(auth.IdToken) ?? body.email,
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Credenciales invalidas';
    return jsonResponse(401, { message });
  }
}

export async function refreshHandler(event: APIGatewayProxyEventV2) {
  const body = parseBody(event);
  if (!body?.refreshToken) {
    return jsonResponse(400, { message: 'refreshToken es requerido' });
  }

  const clientId = requireEnv('USER_POOL_CLIENT_ID');

  try {
    const auth = await refreshUser({
      clientId,
      refreshToken: body.refreshToken,
    });

    if (!auth.AccessToken || !auth.IdToken) {
      return jsonResponse(401, { message: 'Token invalido' });
    }

    // Cognito does not rotate refresh tokens for REFRESH_TOKEN_AUTH.
    const response: Record<string, unknown> = {
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      expiresIn: auth.ExpiresIn,
    };
    if (auth.RefreshToken) {
      response.refreshToken = auth.RefreshToken;
    }
    return jsonResponse(200, response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Token invalido';
    return jsonResponse(401, { message });
  }
}
