import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { createOrderHandler, listOrdersHandler } from './orders';
import { docClient } from '../lib/dynamo';

vi.mock('../lib/dynamo', () => ({
  docClient: {
    send: vi.fn(),
  },
}));

vi.mock('../lib/products', () => ({
  products: [
    {
      id: 'prod-1',
      name: 'One',
      description: 'desc',
      price: 1000,
      currency: 'USD',
      availableQuantity: 5,
    },
    {
      id: 'prod-2',
      name: 'Two',
      description: 'desc',
      price: 2000,
      currency: 'EUR',
      availableQuantity: 5,
    },
  ],
}));

const asEvent = (
  body?: unknown,
  queryStringParameters?: Record<string, string>
): APIGatewayProxyEventV2 =>
  ({
    body: body ? JSON.stringify(body) : undefined,
    queryStringParameters,
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: 'user-123',
            email: 'user@example.com',
          },
        },
      },
    },
  }) as APIGatewayProxyEventV2;

const asEventWithClaims = (
  claims: Record<string, string>,
  body?: unknown
): APIGatewayProxyEventV2 =>
  ({
    body: body ? JSON.stringify(body) : undefined,
    requestContext: {
      authorizer: {
        jwt: {
          claims,
        },
      },
    },
  }) as APIGatewayProxyEventV2;

const asEventWithBody = (
  body: string,
  queryStringParameters?: Record<string, string>
): APIGatewayProxyEventV2 =>
  ({
    body,
    queryStringParameters,
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: 'user-123',
            email: 'user@example.com',
          },
        },
      },
    },
  }) as APIGatewayProxyEventV2;

const asUnauthedEvent = (body?: unknown): APIGatewayProxyEventV2 =>
  ({
    body: body ? JSON.stringify(body) : undefined,
    requestContext: {},
  }) as APIGatewayProxyEventV2;

const parseBody = (response: { body: string }) => JSON.parse(response.body);

describe('orders handlers', () => {
  beforeEach(() => {
    process.env.TABLE_NAME = 'OrdersTable';
    vi.resetAllMocks();
  });

  it('rejects unauthenticated order creation', async () => {
    const response = await createOrderHandler(asUnauthedEvent());
    expect(response.statusCode).toBe(401);
  });

  it('rejects invalid order payload', async () => {
    const response = await createOrderHandler(asEvent({ items: [] }));
    expect(response.statusCode).toBe(400);
  });

  it('rejects invalid JSON payloads', async () => {
    const response = await createOrderHandler(
      asEventWithBody('{invalid-json')
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects non-array items', async () => {
    const response = await createOrderHandler(
      asEvent({ items: 'not-array' })
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects unknown products', async () => {
    const response = await createOrderHandler(
      asEvent({ items: [{ productId: 'missing', quantity: 1 }] })
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects quantities above the max', async () => {
    const response = await createOrderHandler(
      asEvent({ items: [{ productId: 'prod-1', quantity: 1001 }] })
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects non-numeric quantities', async () => {
    const response = await createOrderHandler(
      asEvent({
        items: [{ productId: 'prod-1', quantity: 'bad' }],
      })
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects mixed currency carts', async () => {
    const response = await createOrderHandler(
      asEvent({
        items: [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 1 },
        ],
      })
    );
    expect(response.statusCode).toBe(400);
  });

  it('creates an order successfully', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const response = await createOrderHandler(
      asEvent({ items: [{ productId: 'prod-1', quantity: 2 }] })
    );
    expect(response.statusCode).toBe(201);
    const body = parseBody(response);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(2000);
  });

  it('falls back to default currency when email is missing', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const response = await createOrderHandler(
      asEventWithClaims(
        { sub: 'user-123' },
        { items: [{ productId: 'prod-1', quantity: 1 }] }
      )
    );
    expect(response.statusCode).toBe(201);
    const body = parseBody(response);
    expect(body.currency).toBe('USD');
  });

  it('rejects invalid pagination params', async () => {
    const response = await listOrdersHandler(
      asEvent(undefined, { limit: '0' })
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects invalid pagination token', async () => {
    const response = await listOrdersHandler(
      asEvent(undefined, { nextToken: 'invalid' })
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects pagination token with array payload', async () => {
    const token = Buffer.from(JSON.stringify([])).toString('base64');
    const response = await listOrdersHandler(
      asEvent(undefined, { nextToken: token })
    );
    expect(response.statusCode).toBe(400);
  });

  it('rejects pagination token with wrong shape', async () => {
    const token = Buffer.from(JSON.stringify({ PK: 'USER#1' })).toString(
      'base64'
    );
    const response = await listOrdersHandler(
      asEvent(undefined, { nextToken: token })
    );
    expect(response.statusCode).toBe(400);
  });

  it('returns paginated order list', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({
      Items: [
        {
          orderId: 'order-1',
          status: 'CREATED',
          createdAt: '2024-01-01T00:00:00.000Z',
          items: [],
          total: 1000,
          currency: 'USD',
        },
      ],
      LastEvaluatedKey: { PK: 'USER#1', SK: 'ORDER#2', GSI1PK: 'USER#1', GSI1SK: 'ORDER#2' },
    });

    const response = await listOrdersHandler(asEvent(undefined, { limit: '10' }));
    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    expect(body.items).toHaveLength(1);
    expect(body.nextToken).toBeDefined();
  });

  it('returns empty list when no items are found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const response = await listOrdersHandler(asEvent(undefined, { limit: '10' }));
    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    expect(body.items).toHaveLength(0);
    expect(body.nextToken).toBeUndefined();
  });

  it('returns 500 when query fails', async () => {
    vi.mocked(docClient.send).mockRejectedValueOnce(new Error('fail'));
    const response = await listOrdersHandler(asEvent(undefined, { limit: '10' }));
    expect(response.statusCode).toBe(500);
  });
});
