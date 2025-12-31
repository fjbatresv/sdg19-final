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

  const start = nextTokenParam ? Number(nextTokenParam) : 0;
  if (!Number.isFinite(start) || start < 0 || start > products.length) {
    return jsonResponse(400, { message: 'Parametros de paginacion invalidos' });
  }

  const items = products.slice(start, start + limit);
  const nextToken =
    start + items.length < products.length
      ? String(start + items.length)
      : undefined;

  return jsonResponse(200, {
    items,
    limit,
    nextToken,
    totalCount: products.length,
  });
}
