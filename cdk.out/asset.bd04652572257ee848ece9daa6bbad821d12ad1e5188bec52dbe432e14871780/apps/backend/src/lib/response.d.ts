/**
 * Create an HTTP JSON response object including standard JSON and CORS headers.
 *
 * @param statusCode - HTTP status code for the response
 * @param body - Value to serialize as the JSON response body
 * @returns An object with `statusCode`, `headers` (content-type and CORS entries), and `body` as a JSON string
 */
export declare function jsonResponse<T>(statusCode: number, body: T): {
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
        'access-control-allow-headers': string;
        'access-control-allow-methods': string;
    };
    body: string;
};
//# sourceMappingURL=response.d.ts.map