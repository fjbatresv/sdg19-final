import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { jsonResponse } from '../lib/response';
import { products } from '../lib/products';

export async function productsHandler(_event: APIGatewayProxyEventV2) {
  return jsonResponse(200, products);
}
