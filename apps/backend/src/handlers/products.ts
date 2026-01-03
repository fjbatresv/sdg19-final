import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { jsonResponse } from '../lib/response';
import { products } from '../lib/products';

/**
 * Serve a paginated slice of the static product catalog.
 *
 * Reads `limit` and `nextToken` from the request's query string to determine the slice.
 *
 * @returns An HTTP JSON response:
 * - Status 200 with body { items, limit, nextToken, returnedCount } where `items` is the array slice, `limit` is the requested limit, `nextToken` is a base64-encoded index for the next page or `undefined`, and `returnedCount` is the number of returned items.
 * - Status 400 with body { message: 'Parametros de paginacion invalidos' } when `limit` or `nextToken` are invalid or out of range.
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