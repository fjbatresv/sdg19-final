import { APIGatewayProxyEventV2 } from 'aws-lambda';
/**
 * Serve a paginated slice of the static product catalog.
 *
 * Reads `limit` and `nextToken` from the request's query string to determine the slice.
 *
 * @returns An HTTP JSON response:
 * - Status 200 with body { items, limit, nextToken, returnedCount } where `items` is the array slice, `limit` is the requested limit, `nextToken` is a base64-encoded index for the next page or `undefined`, and `returnedCount` is the number of returned items.
 * - Status 400 with body { message: 'Parametros de paginacion invalidos' } when `limit` or `nextToken` are invalid or out of range.
 */
export declare function productsHandler(event: APIGatewayProxyEventV2): Promise<{
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
        'access-control-allow-headers': string;
        'access-control-allow-methods': string;
    };
    body: string;
}>;
//# sourceMappingURL=products.d.ts.map