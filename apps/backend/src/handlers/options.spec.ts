import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { optionsHandler } from './options';

describe('optionsHandler', () => {
  it('returns CORS preflight response', async () => {
    const response = await optionsHandler({} as APIGatewayProxyEventV2);
    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});
