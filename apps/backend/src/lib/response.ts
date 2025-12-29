/**
 * Create an HTTP JSON response object including standard JSON and CORS headers.
 *
 * @param statusCode - HTTP status code for the response
 * @param body - Value to serialize as the JSON response body
 * @returns An object with `statusCode`, `headers` (content-type and CORS entries), and `body` as a JSON string
 */
export function jsonResponse<T>(statusCode: number, body: T) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}