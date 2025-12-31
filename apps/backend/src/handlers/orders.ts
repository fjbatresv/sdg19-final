import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { jsonResponse } from '../lib/response';
import { requireEnv } from '../lib/env';
import { docClient } from '../lib/dynamo';
import { products } from '../lib/products';

type JwtClaims = {
  sub?: string;
  email?: string;
};

/**
 * Extract JWT claims from API Gateway authorizer context.
 */
function getUserClaims(event: APIGatewayProxyEventV2): JwtClaims | null {
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  if (!claims) {
    return null;
  }
  return claims as JwtClaims;
}

/**
 * Parse JSON body from an API Gateway event.
 */
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

/**
 * Create an order for the authenticated user.
 */
export async function createOrderHandler(event: APIGatewayProxyEventV2) {
  const claims = getUserClaims(event);
  if (!claims?.sub) {
    return jsonResponse(401, { message: 'No autorizado' });
  }

  const body = parseBody(event);
  if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
    return jsonResponse(400, { message: 'items es requerido' });
  }

  try {
    let orderCurrency: string | undefined;
    const orderItems = body.items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Producto invalido: ${item.productId}`);
      }
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 10000) {
        throw new Error(`Cantidad invalida para ${item.productId}`);
      }
      if (!orderCurrency) {
        orderCurrency = product.currency;
      } else if (product.currency !== orderCurrency) {
        throw new Error('Todos los productos deben usar la misma moneda');
      }
      return {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price,
      };
    });

    const total = orderItems.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0
    );

    const orderId = randomUUID();
    const createdAt = new Date().toISOString();
    const tableName = requireEnv('TABLE_NAME');

    const pk = `USER#${claims.sub}`;

    const order = {
      PK: pk,
      SK: `ORDER#${orderId}`,
      GSI1PK: pk,
      GSI1SK: `ORDER#${createdAt}`,
      orderId,
      status: 'CREATED',
      createdAt,
      email: claims.email,
      items: orderItems,
      total,
      currency: orderCurrency ?? 'USD',
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: order,
      })
    );

    return jsonResponse(201, {
      orderId,
      status: order.status,
      createdAt,
      items: orderItems,
      total,
      currency: order.currency,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error creando orden';
    return jsonResponse(400, { message });
  }
}

/**
 * List orders for the authenticated user.
 */
export async function listOrdersHandler(event: APIGatewayProxyEventV2) {
  const claims = getUserClaims(event);
  if (!claims?.sub) {
    return jsonResponse(401, { message: 'No autorizado' });
  }

  const limitParam = event.queryStringParameters?.limit;
  const nextTokenParam = event.queryStringParameters?.nextToken;
  const limit = limitParam ? Number(limitParam) : 20;
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return jsonResponse(400, { message: 'Parametros de paginacion invalidos' });
  }

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (nextTokenParam) {
    try {
      const decoded = Buffer.from(nextTokenParam, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Token invalido');
      }
      exclusiveStartKey = parsed;
    } catch {
      return jsonResponse(400, { message: 'Parametros de paginacion invalidos' });
    }
  }

  try {
    const tableName = requireEnv('TABLE_NAME');
    const pk = `USER#${claims.sub}`;

    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': pk,
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    const items =
      result.Items?.map((item) => ({
        orderId: item.orderId,
        status: item.status,
        createdAt: item.createdAt,
        items: item.items,
        total: item.total,
        currency: item.currency ?? 'USD',
      })) ?? [];

    const nextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return jsonResponse(200, {
      items,
      limit,
      nextToken,
      totalCount: result.Count ?? items.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error leyendo ordenes';
    return jsonResponse(500, { message });
  }
}
