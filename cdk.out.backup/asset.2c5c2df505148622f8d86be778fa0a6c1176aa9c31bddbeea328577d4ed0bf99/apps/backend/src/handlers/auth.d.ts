import { APIGatewayProxyEventV2 } from 'aws-lambda';
export declare function registerHandler(event: APIGatewayProxyEventV2): Promise<{
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
        'access-control-allow-headers': string;
        'access-control-allow-methods': string;
    };
    body: string;
}>;
export declare function loginHandler(event: APIGatewayProxyEventV2): Promise<{
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
        'access-control-allow-headers': string;
        'access-control-allow-methods': string;
    };
    body: string;
}>;
export declare function refreshHandler(event: APIGatewayProxyEventV2): Promise<{
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
        'access-control-allow-headers': string;
        'access-control-allow-methods': string;
    };
    body: string;
}>;
//# sourceMappingURL=auth.d.ts.map