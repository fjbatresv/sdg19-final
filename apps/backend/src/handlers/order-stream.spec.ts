import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { orderStreamHandler } from './order-stream';
import { publishOrder } from '../lib/sns';

vi.mock('../lib/sns', () => ({
  publishOrder: vi.fn(),
}));

const asEvent = (records: DynamoDBStreamEvent['Records']): DynamoDBStreamEvent => ({
  Records: records,
});

const buildRecord = (
  eventName: DynamoDBRecord['eventName'],
  newImage?: NonNullable<DynamoDBRecord['dynamodb']>['NewImage']
): DynamoDBRecord => ({
  eventID: '1',
  eventName,
  eventVersion: '1.1',
  eventSource: 'aws:dynamodb',
  eventSourceARN: 'arn:aws:dynamodb:us-east-1:123:table/orders/stream/1',
  awsRegion: 'us-east-1',
  dynamodb: newImage ? { NewImage: newImage } : undefined,
});

describe('orderStreamHandler', () => {
  beforeEach(() => {
    process.env.ORDERS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123:orders';
    vi.resetAllMocks();
  });

  it('skips non-insert events', async () => {
    await orderStreamHandler(
      asEvent([
        buildRecord('MODIFY'),
      ])
    );
    expect(publishOrder).not.toHaveBeenCalled();
  });

  it('publishes order inserts', async () => {
    await orderStreamHandler(
      asEvent([
        buildRecord('INSERT', {
          PK: { S: 'USER#1' },
          SK: { S: 'ORDER#1' },
          orderId: { S: 'order-1' },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          total: { N: '1000' },
          status: { S: 'CREATED' },
        }),
      ])
    );
    expect(publishOrder).toHaveBeenCalledTimes(1);
  });

  it('skips non-order items', async () => {
    await orderStreamHandler(
      asEvent([
        buildRecord('INSERT', {
          PK: { S: 'USER#1' },
          SK: { S: 'PROFILE#1' },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
        }),
      ])
    );
    expect(publishOrder).not.toHaveBeenCalled();
  });
});
