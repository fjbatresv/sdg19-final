export declare function jsonResponse<T>(statusCode: number, body: T): {
    statusCode: number;
    headers: {
        'content-type': string;
        'access-control-allow-origin': string;
    };
    body: string;
};
//# sourceMappingURL=response.d.ts.map