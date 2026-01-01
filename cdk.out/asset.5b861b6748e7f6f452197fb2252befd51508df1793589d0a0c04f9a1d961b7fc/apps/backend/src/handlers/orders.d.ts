import { APIGatewayProxyEventV2 } from 'aws-lambda';
export declare function createOrderHandler(event: APIGatewayProxyEventV2): Promise<{
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
    };
    body: string;
}>;
export declare function listOrdersHandler(event: APIGatewayProxyEventV2): Promise<{
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
    };
    body: string;
}>;
//# sourceMappingURL=orders.d.ts.map