import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import {
  loginHandler,
  refreshHandler,
  registerHandler,
} from './auth';
import {
  loginUser,
  refreshUser,
  registerUser,
} from '../lib/cognito';

vi.mock('../lib/cognito', () => ({
  loginUser: vi.fn(),
  refreshUser: vi.fn(),
  registerUser: vi.fn(),
}));

const asEvent = (body?: unknown): APIGatewayProxyEventV2 =>
  ({
    body: body ? JSON.stringify(body) : undefined,
    requestContext: {},
  }) as APIGatewayProxyEventV2;

const parseBody = (response: { body: string }) => JSON.parse(response.body);

describe('auth handlers', () => {
  beforeEach(() => {
    process.env.USER_POOL_ID = 'pool-123';
    process.env.USER_POOL_CLIENT_ID = 'client-123';
    vi.resetAllMocks();
  });

  it('rejects register when body is missing', async () => {
    const response = await registerHandler(asEvent());
    expect(response.statusCode).toBe(400);
  });

  it('rejects invalid JSON payloads', async () => {
    const response = await registerHandler({
      body: '{not-json',
      requestContext: {},
    } as APIGatewayProxyEventV2);
    expect(response.statusCode).toBe(400);
  });

  it('rejects invalid JSON on login', async () => {
    const response = await loginHandler({
      body: '{not-json',
      requestContext: {},
    } as APIGatewayProxyEventV2);
    expect(response.statusCode).toBe(400);
  });

  it('rejects register when password is short', async () => {
    const response = await registerHandler(
      asEvent({ email: 'test@example.com', password: 'short' })
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects register when password lacks complexity', async () => {
    const response = await registerHandler(
      asEvent({ email: 'test@example.com', password: 'Password1234' })
    );
    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when register fails', async () => {
    vi.mocked(registerUser).mockRejectedValue(new Error('fail'));
    const response = await registerHandler(
      asEvent({ email: 'test@example.com', password: 'Password!123' })
    );
    expect(response.statusCode).toBe(400);
  });

  it('registers and logs in a user', async () => {
    vi.mocked(registerUser).mockResolvedValue(undefined);
    vi.mocked(loginUser).mockResolvedValue({
      AccessToken: 'access',
      IdToken: [
        'header',
        Buffer.from(JSON.stringify({ sub: 'user-123' })).toString('base64url'),
        'sig',
      ].join('.'),
      RefreshToken: 'refresh',
      ExpiresIn: 3600,
    });

    const response = await registerHandler(
      asEvent({ email: 'test@example.com', password: 'Password!123' })
    );
    expect(response.statusCode).toBe(201);
    const body = parseBody(response);
    expect(body.userId).toBe('user-123');
    expect(body.accessToken).toBe('access');
  });

  it('rejects login when tokens are missing', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      AccessToken: '',
      IdToken: '',
    });

    const response = await loginHandler(
      asEvent({ email: 'test@example.com', password: 'Password!123' })
    );
    expect(response.statusCode).toBe(401);
  });

  it('returns 401 when login throws', async () => {
    vi.mocked(loginUser).mockRejectedValue(new Error('fail'));
    const response = await loginHandler(
      asEvent({ email: 'test@example.com', password: 'Password!123' })
    );
    expect(response.statusCode).toBe(401);
  });

  it('returns tokens on login', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      AccessToken: 'access',
      IdToken: [
        'header',
        Buffer.from(JSON.stringify({ sub: 'user-456' })).toString('base64url'),
        'sig',
      ].join('.'),
      RefreshToken: 'refresh',
      ExpiresIn: 3600,
    });

    const response = await loginHandler(
      asEvent({ email: 'test@example.com', password: 'Password!123' })
    );
    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    expect(body.userId).toBe('user-456');
  });

  it('falls back to email when id token has no sub', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      AccessToken: 'access',
      IdToken: [
        'header',
        Buffer.from(JSON.stringify({})).toString('base64url'),
        'sig',
      ].join('.'),
      RefreshToken: 'refresh',
      ExpiresIn: 3600,
    });

    const response = await loginHandler(
      asEvent({ email: 'test@example.com', password: 'Password!123' })
    );
    const body = parseBody(response);
    expect(body.userId).toBe('test@example.com');
  });

  it('handles malformed id token', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      AccessToken: 'access',
      IdToken: 'invalid-token',
      RefreshToken: 'refresh',
      ExpiresIn: 3600,
    });

    const response = await loginHandler(
      asEvent({ email: 'test@example.com', password: 'Password!123' })
    );
    expect(response.statusCode).toBe(200);
  });

  it('rejects refresh without token', async () => {
    const response = await refreshHandler(asEvent({}));
    expect(response.statusCode).toBe(400);
  });

  it('rejects invalid JSON on refresh', async () => {
    const response = await refreshHandler({
      body: '{not-json',
      requestContext: {},
    } as APIGatewayProxyEventV2);
    expect(response.statusCode).toBe(400);
  });

  it('refreshes tokens', async () => {
    vi.mocked(refreshUser).mockResolvedValue({
      AccessToken: 'access',
      IdToken: 'id',
      RefreshToken: 'refresh',
      ExpiresIn: 3600,
    });

    const response = await refreshHandler(
      asEvent({ refreshToken: 'refresh' })
    );
    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    expect(body.refreshToken).toBe('refresh');
  });

  it('returns 401 when refresh returns missing tokens', async () => {
    vi.mocked(refreshUser).mockResolvedValue({
      AccessToken: '',
      IdToken: '',
    });

    const response = await refreshHandler(
      asEvent({ refreshToken: 'refresh' })
    );
    expect(response.statusCode).toBe(401);
  });

  it('returns 401 when refresh throws', async () => {
    vi.mocked(refreshUser).mockRejectedValue(new Error('fail'));

    const response = await refreshHandler(
      asEvent({ refreshToken: 'refresh' })
    );
    expect(response.statusCode).toBe(401);
  });
});
