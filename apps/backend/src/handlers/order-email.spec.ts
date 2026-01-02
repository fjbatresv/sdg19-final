import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SQSEvent } from 'aws-lambda';

const s3SendMock = vi.fn();
const sesSendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = s3SendMock;
  },
  PutObjectCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: class {
    send = sesSendMock;
  },
  SendTemplatedEmailCommand: class {
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
      attributes: {},
      messageAttributes: {},
      md5OfBody: '',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:orders',
      awsRegion: 'us-east-1',
    },
  ],
});

describe('orderEmailHandler', () => {
  beforeEach(() => {
    s3SendMock.mockReset();
    sesSendMock.mockReset();
    s3SendMock.mockResolvedValue({});
    sesSendMock.mockResolvedValue({});
    process.env.EMAILS_BUCKET_NAME = 'emails-bucket';
    process.env.SES_TEMPLATE_NAME = 'order-template';
    process.env.SES_FROM_ADDRESS = 'noreply@example.com';
    process.env.EMAILS_BUCKET_KMS_KEY_ID = 'kms-key-id';
  });

  it('sends SES email and stores a copy in S3', async () => {
    const { orderEmailHandler } = await import('./order-email');
    const message = {
      orderId: 'order-123',
      createdAt: '2025-12-29T12:00:00Z',
      status: 'CREATED',
      total: 9950,
      email: 'user@example.com',
      items: [
        {
          productId: 'p1',
          productName: 'Starter Pack',
          quantity: 1,
          unitPrice: 999,
        },
      ],
    };
    const event = buildEvent(JSON.stringify({ Message: JSON.stringify(message) }));

    await orderEmailHandler(event);

    expect(sesSendMock).toHaveBeenCalledTimes(1);
    const sesInput = (sesSendMock.mock.calls[0]?.[0] as { input: any }).input;
    expect(sesInput.Source).toBe('noreply@example.com');
    expect(sesInput.Template).toBe('order-template');
    expect(sesInput.Destination.ToAddresses).toEqual(['user@example.com']);

    expect(s3SendMock).toHaveBeenCalledTimes(1);
    const s3Input = (s3SendMock.mock.calls[0]?.[0] as { input: any }).input;
    expect(s3Input.Bucket).toBe('emails-bucket');
    expect(s3Input.Key).toContain('order-123');
    expect(s3Input.ServerSideEncryption).toBe('aws:kms');
    expect(s3Input.SSEKMSKeyId).toBe('kms-key-id');
  });

  it('skips messages without email', async () => {
    const { orderEmailHandler } = await import('./order-email');
    const event = buildEvent(JSON.stringify({ orderId: 'order-999' }));

    await orderEmailHandler(event);

    expect(sesSendMock).not.toHaveBeenCalled();
    expect(s3SendMock).not.toHaveBeenCalled();
  });

  it('ignores invalid JSON payloads', async () => {
    const { orderEmailHandler } = await import('./order-email');
    const event = buildEvent('invalid-json');

    await orderEmailHandler(event);

    expect(sesSendMock).not.toHaveBeenCalled();
    expect(s3SendMock).not.toHaveBeenCalled();
  });

  it('falls back to productId when productName is empty', async () => {
    const { orderEmailHandler } = await import('./order-email');
    const message = {
      orderId: 'order-321',
      email: 'user@example.com',
      items: [
        {
          productId: 'prod-1',
          productName: '',
          quantity: 1,
          unitPrice: 2500,
        },
      ],
    };
    const event = buildEvent(JSON.stringify(message));

    await orderEmailHandler(event);

    const sesInput = (sesSendMock.mock.calls[0]?.[0] as { input: any }).input;
    const payload = JSON.parse(sesInput.TemplateData);
    expect(payload.itemsHtml).toContain('prod-1');
  });

  it('throws when SES fails', async () => {
    const { orderEmailHandler } = await import('./order-email');
    sesSendMock.mockRejectedValueOnce(new Error('ses failed'));
    const event = buildEvent(
      JSON.stringify({ orderId: 'order-123', email: 'user@example.com' })
    );

    await expect(orderEmailHandler(event)).rejects.toThrow('ses failed');
  });

  it('throws when S3 fails', async () => {
    const { orderEmailHandler } = await import('./order-email');
    s3SendMock.mockRejectedValueOnce(new Error('s3 failed'));
    const event = buildEvent(
      JSON.stringify({ orderId: 'order-123', email: 'user@example.com' })
    );

    await expect(orderEmailHandler(event)).rejects.toThrow('s3 failed');
  });

  it('skips invalid createdAt values', async () => {
    const { orderEmailHandler } = await import('./order-email');
    const event = buildEvent(
      JSON.stringify({
        orderId: 'order-777',
        email: 'user@example.com',
        createdAt: 'invalid-date',
      })
    );

    await orderEmailHandler(event);

    expect(sesSendMock).not.toHaveBeenCalled();
  });

  it('skips invalid total values', async () => {
    const { orderEmailHandler } = await import('./order-email');
    const event = buildEvent(
      JSON.stringify({
        orderId: 'order-888',
        email: 'user@example.com',
        total: 'bad',
      })
    );

    await orderEmailHandler(event);

    expect(sesSendMock).not.toHaveBeenCalled();
  });

  it('handles raw order messages without SNS wrapper', async () => {
    const { orderEmailHandler } = await import('./order-email');
    const event = buildEvent(
      JSON.stringify({
        orderId: 'order-555',
        email: 'user@example.com',
        items: [],
      })
    );

    await orderEmailHandler(event);

    expect(sesSendMock).toHaveBeenCalledTimes(1);
  });
});
