import { APIGatewayProxyEventV2 } from 'aws-lambda';

export async function optionsHandler(_event: APIGatewayProxyEventV2) {
  return {
    statusCode: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers':
        'authorization,content-type,x-amz-date,x-api-key,x-amz-security-token,x-amz-user-agent',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: '',
  };
}
