import { APIGatewayProxyEventV2 } from 'aws-lambda';
export declare function optionsHandler(_event: APIGatewayProxyEventV2): Promise<{
    statusCode: number;
    headers: {
        'access-control-allow-origin': string;
        'access-control-allow-headers': string;
        'access-control-allow-methods': string;
    };
    body: string;
}>;
//# sourceMappingURL=options.d.ts.map