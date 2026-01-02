import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { productsHandler } from './products';

const asEvent = (
  queryStringParameters?: Record<string, string>
): APIGatewayProxyEventV2 =>
  ({
    queryStringParameters,
    requestContext: {},
  }) as APIGatewayProxyEventV2;

const parseBody = (response: { body: string }) => JSON.parse(response.body);

describe('products handler', () => {
  it('rejects invalid limit values', async () => {
    const response = await productsHandler(asEvent({ limit: '0' }));
    expect(response.statusCode).toBe(400);
  });

  it('rejects invalid nextToken values', async () => {
    const response = await productsHandler(asEvent({ nextToken: 'not-base64' }));
    expect(response.statusCode).toBe(400);
  });

  it('rejects nextToken outside bounds', async () => {
    const token = Buffer.from('999').toString('base64');
    const response = await productsHandler(asEvent({ nextToken: token }));
    expect(response.statusCode).toBe(400);
  });

  it('returns catalog with pagination', async () => {
    const response = await productsHandler(asEvent({ limit: '1' }));
    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    expect(body.items).toHaveLength(1);
    expect(body.nextToken).toBeDefined();
  });

  it('returns undefined nextToken at end of list', async () => {
    const response = await productsHandler(asEvent({ limit: '100' }));
    const body = parseBody(response);
    expect(body.nextToken).toBeUndefined();
  });
});
