import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { optionsHandler } from './options';

describe('optionsHandler', () => {
  it('returns CORS preflight response', async () => {
    const response = await optionsHandler({} as APIGatewayProxyEventV2);
    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,POST,OPTIONS'
    );
    expect(response.headers['access-control-allow-headers']).toBe(
      'authorization,content-type,x-amz-date,x-api-key,x-amz-security-token,x-amz-user-agent'
    );
    expect(response.headers['access-control-max-age']).toBe('86400');
  });

  it('echoes the request origin when provided', async () => {
    const response = await optionsHandler({
      headers: { origin: 'https://example.com' },
    } as APIGatewayProxyEventV2);

    expect(response.headers['access-control-allow-origin']).toBe(
      'https://example.com'
    );
  });
});
