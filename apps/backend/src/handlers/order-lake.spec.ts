import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SQSEvent } from 'aws-lambda';

const kinesisSendMock = vi.fn();

vi.mock('@aws-sdk/client-kinesis', () => ({
  KinesisClient: class {
    send = kinesisSendMock;
  },
  PutRecordCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));

const buildEvent = (body: string): SQSEvent => ({
  Records: [
    {
      messageId: 'msg-1',
      receiptHandle: 'r1',
      body,
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: '1735490000000',
        SenderId: 'sender-id',
        ApproximateFirstReceiveTimestamp: '1735490000000',
      },
      messageAttributes: {},
      md5OfBody: '',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:orders-lake',
      awsRegion: 'us-east-1',
    },
  ],
});

describe('orderLakeHandler', () => {
  beforeEach(() => {
    kinesisSendMock.mockReset();
    kinesisSendMock.mockResolvedValue({});
    process.env.KINESIS_STREAM_NAME = 'orders-stream';
  });

  it('sends order payload to kinesis', async () => {
    const { orderLakeHandler } = await import('./order-lake');
    const message = {
      orderId: 'order-123',
      userPk: 'user-123',
      createdAt: '2025-12-29T12:00:00Z',
      status: 'CREATED',
      total: 99.5,
      items: [{ productId: 'p1', quantity: 1 }],
    };
    const event = buildEvent(JSON.stringify({ Message: JSON.stringify(message) }));

    await orderLakeHandler(event);

    expect(kinesisSendMock).toHaveBeenCalledTimes(1);
    const kinesisInput = (kinesisSendMock.mock.calls[0]?.[0] as { input: any })
      .input;
    expect(kinesisInput.StreamName).toBe('orders-stream');
    expect(kinesisInput.PartitionKey).toBe('order-123');
    const dataBuffer = Buffer.isBuffer(kinesisInput.Data)
      ? kinesisInput.Data
      : Buffer.from(kinesisInput.Data as Uint8Array);
    const payload = JSON.parse(dataBuffer.toString('utf-8'));
    expect(payload.orderId).toBe('order-123');
    expect(payload.userPk).toBe('user-123');
  });

  it('skips invalid messages', async () => {
    const { orderLakeHandler } = await import('./order-lake');
    const event = buildEvent(JSON.stringify({ status: 'CREATED' }));

    await orderLakeHandler(event);

    expect(kinesisSendMock).not.toHaveBeenCalled();
  });

  it('rethrows when kinesis fails', async () => {
    kinesisSendMock.mockRejectedValueOnce(new Error('Kinesis error'));
    const { orderLakeHandler } = await import('./order-lake');
    const message = {
      orderId: 'order-456',
      userPk: 'user-456',
      createdAt: '2025-12-29T12:00:00Z',
      status: 'CREATED',
      total: 12.5,
    };
    const event = buildEvent(JSON.stringify({ Message: JSON.stringify(message) }));

    await expect(orderLakeHandler(event)).rejects.toThrow('Kinesis error');
  });
});
