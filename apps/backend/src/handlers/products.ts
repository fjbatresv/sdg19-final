import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { jsonResponse } from '../lib/response';
import { products } from '../lib/products';

/**
 * Return the static catalog of products.
 */
export async function productsHandler(event: APIGatewayProxyEventV2) {
  const limitParam = event.queryStringParameters?.limit;
  const nextTokenParam = event.queryStringParameters?.nextToken;
  const limit = limitParam ? Number(limitParam) : 20;

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return jsonResponse(400, { message: 'Parametros de paginacion invalidos' });
  }

  let start = 0;
  if (nextTokenParam) {
    try {
      const decoded = Buffer.from(nextTokenParam, 'base64').toString('utf8');
      start = Number(decoded);
      if (!Number.isFinite(start)) {
        throw new TypeError('Invalid token');
      }
    } catch {
      return jsonResponse(400, { message: 'Parametros de paginacion invalidos' });
    }
  }
  if (start < 0 || start > products.length) {
    return jsonResponse(400, { message: 'Parametros de paginacion invalidos' });
  }

  const items = products.slice(start, start + limit);
  const nextToken =
    start + items.length < products.length
      ? Buffer.from(String(start + items.length)).toString('base64')
      : undefined;

  return jsonResponse(200, {
    items,
    limit,
    nextToken,
    returnedCount: items.length,
  });
}
