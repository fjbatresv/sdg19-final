import { DynamoDBStreamEvent } from 'aws-lambda';
import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { publishOrder } from '../lib/sns';
import { requireEnv } from '../lib/env';

export async function orderStreamHandler(event: DynamoDBStreamEvent) {
  const topicArn = requireEnv('ORDERS_TOPIC_ARN');

  for (const record of event.Records) {
    if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) {
      continue;
    }

    const image = unmarshall(
      record.dynamodb.NewImage as unknown as Record<string, AttributeValue>
    );
    if (typeof image.SK !== 'string' || !image.SK.startsWith('ORDER#')) {
      continue;
    }

    await publishOrder(topicArn, {
      orderId: image.orderId,
      userPk: image.PK,
      createdAt: image.createdAt,
      total: image.total,
      items: image.items,
      email: image.email,
      status: image.status,
    });
  }
}
