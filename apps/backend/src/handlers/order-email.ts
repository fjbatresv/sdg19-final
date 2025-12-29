import { SQSEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { requireEnv } from '../lib/env';

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
  const visible = local.slice(0, 2);
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

export async function orderEmailHandler(event: SQSEvent) {
  const bucketName = requireEnv('EMAILS_BUCKET_NAME');
  const templateName = requireEnv('SES_TEMPLATE_NAME');
  const fromAddress = requireEnv('SES_FROM_ADDRESS');

  for (const record of event.Records) {
    const message = parseOrderMessage(record.body);
    if (!message?.email) {
      console.warn('order-email: skipped message without email', {
        orderId: message?.orderId ?? 'unknown',
      });
      continue;
    }
    const orderId = message.orderId ?? 'unknown';
    const recipient = maskEmail(message.email);
    console.info('order-email: sending confirmation', {
      orderId,
      recipient,
      status: message.status ?? 'unknown',
    });

    const templateData = JSON.stringify({
      orderId: message.orderId,
      createdAt: message.createdAt,
      status: message.status,
      total: message.total,
      items: message.items,
      userPk: message.userPk,
      email: message.email,
    });

    try {
      await ses.send(
        new SendTemplatedEmailCommand({
          Source: fromAddress,
          Destination: { ToAddresses: [message.email] },
          Template: templateName,
          TemplateData: templateData,
        })
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      console.error('order-email: SES send failed', { orderId, reason });
      throw error;
    }

    const key = `orders/${message.orderId ?? 'unknown'}/${Date.now()}.json`;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: 'application/json',
          Body: JSON.stringify({
            to: message.email,
            from: fromAddress,
            template: templateName,
            data: JSON.parse(templateData),
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
