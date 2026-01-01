import { APIGatewayProxyEventV2 } from 'aws-lambda';
/**
 * Handle CORS preflight (OPTIONS) requests for API Gateway.
 *
 * @returns Response object with status code 204, CORS headers allowing all origins and the headers/methods required for browser preflight, and an empty body.
 */
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