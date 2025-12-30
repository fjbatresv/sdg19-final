import { SQSEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { requireEnv } from '../lib/env';
import { randomUUID } from 'node:crypto';

type OrderMessage = {
  orderId?: string;
  userPk?: string;
  createdAt?: string;
  total?: number;
  items?: unknown[];
  email?: string;
  status?: string;
};

const s3 = new S3Client({});
const ses = new SESClient({});

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return 'unknown';
  }
  const visible = local.length <= 2 ? '*' : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

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
): payload is OrderMessage & { orderId: string; email: string } {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const message = payload as OrderMessage;
  if (typeof message.orderId !== 'string' || message.orderId.trim().length === 0) {
    return false;
  }
  if (typeof message.email !== 'string' || message.email.trim().length === 0) {
    return false;
  }
  if (
    message.createdAt !== undefined &&
    (typeof message.createdAt !== 'string' ||
      Number.isNaN(Date.parse(message.createdAt)))
  ) {
    return false;
  }
  if (message.total !== undefined && typeof message.total !== 'number') {
    return false;
  }
  return true;
}

export async function orderEmailHandler(event: SQSEvent) {
  const bucketName = requireEnv('EMAILS_BUCKET_NAME');
  const templateName = requireEnv('SES_TEMPLATE_NAME');
  const fromAddress = requireEnv('SES_FROM_ADDRESS');
  const kmsKeyId = requireEnv('EMAILS_BUCKET_KMS_KEY_ID');

  for (const record of event.Records) {
    const message = parseOrderMessage(record.body);
    if (!isValidOrderMessage(message)) {
      console.warn('order-email: invalid message payload', {
        messageId: record.messageId,
      });
      continue;
    }
    const orderId = message.orderId;
    const recipient = maskEmail(message.email);
    console.info('order-email: sending confirmation', {
      orderId,
      recipient,
      status: message.status ?? 'unknown',
    });

    const templateData = {
      orderId: message.orderId,
      createdAt: message.createdAt,
      status: message.status,
      total: message.total,
      items: message.items,
      userPk: message.userPk,
    };

    try {
      await ses.send(
        new SendTemplatedEmailCommand({
          Source: fromAddress,
          Destination: { ToAddresses: [message.email] },
          Template: templateName,
          TemplateData: JSON.stringify(templateData),
        })
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      console.error('order-email: SES send failed', { orderId, reason });
      throw error;
    }

    const key = `orders/${message.orderId}/${Date.now()}-${randomUUID()}.json`;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: 'application/json',
          ServerSideEncryption: 'aws:kms',
          SSEKMSKeyId: kmsKeyId,
          Body: JSON.stringify({
            from: fromAddress,
            template: templateName,
            data: templateData,
          }),
        })
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      console.error('order-email: S3 write failed', { orderId, reason });
      throw error;
    }
    console.info('order-email: stored email copy', { orderId, key });
  }
}
