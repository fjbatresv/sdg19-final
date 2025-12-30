import { SQSEvent } from 'aws-lambda';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { requireEnv } from '../lib/env';

type OrderMessage = {
  orderId?: string;
  userPk?: string;
  createdAt?: string;
  total?: number;
  items?: unknown[];
  status?: string;
};

// Kinesis region defaults to AWS_REGION so execution is deterministic in Lambda.
const kinesis = new KinesisClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const ISO_8601_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

function parseOrderMessage(body: string): OrderMessage | null {
  try {
    const parsed = JSON.parse(body);
    if (parsed?.Message) {
      return JSON.parse(parsed.Message) as OrderMessage;
    }
    return parsed as OrderMessage;
  } catch {
    return null;
  }
}

function isValidOrderMessage(
  payload: unknown
): payload is OrderMessage & { orderId: string } {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const message = payload as OrderMessage;
  if (typeof message.orderId !== 'string' || message.orderId.trim().length === 0) {
    return false;
  }
  if (
    message.createdAt !== undefined &&
    (typeof message.createdAt !== 'string' ||
      !ISO_8601_REGEX.test(message.createdAt))
  ) {
    return false;
  }
  if (message.total !== undefined && typeof message.total !== 'number') {
    return false;
  }
  return true;
}

export async function orderLakeHandler(event: SQSEvent) {
  const streamName = requireEnv('KINESIS_STREAM_NAME');
  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    const message = parseOrderMessage(record.body);
    if (!isValidOrderMessage(message)) {
      console.warn('order-lake: invalid message payload', {
        messageId: record.messageId,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    const payload = {
      orderId: message.orderId,
      createdAt: message.createdAt,
      status: message.status,
      total: message.total,
      items: message.items,
      userPk: message.userPk,
    };

    try {
      await kinesis.send(
        new PutRecordCommand({
          StreamName: streamName,
          PartitionKey: message.orderId,
          Data: Buffer.from(JSON.stringify(payload)),
        })
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      console.error('order-lake: kinesis put failed', {
        orderId: message.orderId,
        reason,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}
