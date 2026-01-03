import { APIGatewayProxyEventV2 } from 'aws-lambda';
/**
 * Return the static catalog of products.
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