import { APIGatewayProxyEventV2 } from 'aws-lambda';
export declare function productsHandler(_event: APIGatewayProxyEventV2): Promise<{
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
    };
    body: string;
}>;
//# sourceMappingURL=products.d.ts.map