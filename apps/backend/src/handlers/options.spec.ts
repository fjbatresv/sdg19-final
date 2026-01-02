import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { optionsHandler } from './options';

describe('optionsHandler', () => {
  const originalWebDomain = process.env.WEB_DOMAIN_NAME;

  beforeEach(() => {
    process.env.WEB_DOMAIN_NAME = 'finalweb.example.com';
  });

  afterEach(() => {
    if (originalWebDomain === undefined) {
      delete process.env.WEB_DOMAIN_NAME;
    } else {
      process.env.WEB_DOMAIN_NAME = originalWebDomain;
    }
  });

  it('returns CORS preflight response', async () => {
    const response = await optionsHandler({} as APIGatewayProxyEventV2);
    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://finalweb.example.com'
    );
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,POST,OPTIONS'
    );
    expect(response.headers['access-control-allow-headers']).toBe(
      'authorization,content-type,x-amz-date,x-api-key,x-amz-security-token,x-amz-user-agent'
    );
    expect(response.headers['access-control-max-age']).toBe('86400');
  });

  it('echoes the request origin when it matches the web domain', async () => {
    const response = await optionsHandler({
      headers: { origin: 'https://finalweb.example.com' },
    } as APIGatewayProxyEventV2);

    expect(response.headers['access-control-allow-origin']).toBe(
      'https://finalweb.example.com'
    );
  });

  it('falls back to the configured web domain when origin does not match', async () => {
    const response = await optionsHandler({
      headers: { origin: 'https://evil.example.com' },
    } as APIGatewayProxyEventV2);

    expect(response.headers['access-control-allow-origin']).toBe(
      'https://finalweb.example.com'
    );
  });
});
