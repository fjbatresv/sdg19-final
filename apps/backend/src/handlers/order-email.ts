import { SQSEvent } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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

type EmailCopyStatus = 'pending' | 'sent';

type OrderItem = {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
};

const s3 = new S3Client({});
const ses = new SESClient({});

type ValidOrderMessage = OrderMessage & { orderId: string; email: string };

/**
 * Obfuscate the email to avoid logging full addresses.
 */
function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return 'unknown';
  }
  const visible = local.length <= 2 ? '*' : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"'/]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      case '/':
        return '&#x2F;';
      default:
        return char;
    }
  });
}

/**
 * Parse an SNS-wrapped or raw order message from SQS.
 */
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

/**
 * Validate the minimum fields required to send an email.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidOrderMessage(payload: unknown): payload is ValidOrderMessage {
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
  if (!EMAIL_REGEX.test(message.email)) {
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

/**
 * Validate item shape coming from the order payload.
 */
function isOrderItem(value: unknown): value is OrderItem {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Partial<OrderItem>;
  return (
    typeof item.productId === 'string' &&
    typeof item.quantity === 'number' &&
    typeof item.unitPrice === 'number'
  );
}

function buildItemsHtml(items: OrderItem[]) {
  return items
    .map((item) => {
      const displayNameRaw = item.productName?.trim()
        ? item.productName
        : item.productId;
      const displayName = escapeHtml(displayNameRaw);
      const unitPrice = (item.unitPrice / 100).toFixed(2);
      return `<tr>
              <td style="padding:14px 14px;background:#fcfcfd;border:1px solid #eaecf0;border-radius:12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:800;color:#101828;">
                      ${displayName}
                    </td>
                    <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#475467;">
                      x${item.quantity}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#667085;">
                      Precio unitario
                    </td>
                    <td align="right" style="padding-top:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#667085;">
                      $ ${unitPrice}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
    })
    .join('');
}

function buildTemplateData(message: ValidOrderMessage, items: OrderItem[]) {
  const formattedTotal =
    typeof message.total === 'number'
      ? (message.total / 100).toFixed(2)
      : undefined;
  return {
    orderId: message.orderId,
    status: message.status,
    total: formattedTotal,
    userPk: message.userPk,
    year: new Date().getFullYear(),
    itemsHtml: buildItemsHtml(items),
  };
}

function buildEmailCopyKey(orderId: string, messageId: string) {
  return `orders/${orderId}/${messageId}.json`;
}

function buildEmailCopyBody(params: {
  orderId: string;
  messageId: string;
  templateName: string;
  fromAddress: string;
  status: EmailCopyStatus;
  templateData: Record<string, unknown>;
}) {
  const { orderId, messageId, templateName, fromAddress, status, templateData } =
    params;
  return {
    orderId,
    messageId,
    from: fromAddress,
    template: templateName,
    status,
    data: templateData,
    updatedAt: new Date().toISOString(),
  };
}

async function getEmailCopyStatus(params: {
  bucketName: string;
  orderId: string;
  key: string;
}): Promise<EmailCopyStatus | null> {
  const { bucketName, orderId, key } = params;
  try {
    const { Body } = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    if (!Body || typeof Body !== 'object' || !('transformToString' in Body)) {
      return null;
    }
    const raw = await (
      Body as { transformToString: () => Promise<string> }
    ).transformToString();
    const parsed = JSON.parse(raw) as { status?: EmailCopyStatus };
    return parsed.status === 'pending' || parsed.status === 'sent'
      ? parsed.status
      : null;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error) {
      const name = (error as { name?: string }).name;
      if (name === 'NoSuchKey') {
        return null;
      }
    }
    const reason = error instanceof Error ? error.message : 'unknown';
    console.warn('order-email: unable to read email copy status', {
      orderId,
      reason,
    });
    return null;
  }
}

async function sendOrderEmail(params: {
  orderId: string;
  templateName: string;
  fromAddress: string;
  toAddress: string;
  templateData: Record<string, unknown>;
}) {
  const { orderId, templateName, fromAddress, toAddress, templateData } = params;
  try {
    await ses.send(
      new SendTemplatedEmailCommand({
        Source: fromAddress,
        Destination: { ToAddresses: [toAddress] },
        Template: templateName,
        TemplateData: JSON.stringify(templateData),
      })
    );
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error('order-email: SES send failed', { orderId, reason });
    throw error;
  }
}

async function putEmailCopy(params: {
  orderId: string;
  messageId: string;
  key: string;
  bucketName: string;
  kmsKeyId: string;
  templateName: string;
  fromAddress: string;
  status: EmailCopyStatus;
  templateData: Record<string, unknown>;
}) {
  const {
    orderId,
    messageId,
    key,
    bucketName,
    kmsKeyId,
    templateName,
    fromAddress,
    status,
    templateData,
  } = params;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: 'application/json',
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: kmsKeyId,
        Body: JSON.stringify({
          ...buildEmailCopyBody({
            orderId,
            messageId,
            templateName,
            fromAddress,
            status,
            templateData,
          }),
        }),
      })
    );
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error('order-email: S3 write failed', { orderId, reason });
    throw error;
  }
}

/**
 * Send SES templated email for each order message and store a copy in S3.
 */
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
    const messageId = record.messageId;
    const key = buildEmailCopyKey(orderId, messageId);
    const items = Array.isArray(message.items)
      ? message.items.filter(isOrderItem)
      : [];
    const recipient = maskEmail(message.email);
    console.info('order-email: sending confirmation', {
      orderId,
      recipient,
      status: message.status ?? 'unknown',
    });

    const templateData = buildTemplateData(message, items);
    const existingStatus = await getEmailCopyStatus({
      bucketName,
      orderId,
      key,
    });
    if (existingStatus === 'sent') {
      console.info('order-email: copy already marked sent', { orderId, key });
      continue;
    }
    if (!existingStatus) {
      await putEmailCopy({
        orderId,
        messageId,
        key,
        bucketName,
        kmsKeyId,
        templateName,
        fromAddress,
        status: 'pending',
        templateData,
      });
    }
    await sendOrderEmail({
      orderId,
      templateName,
      fromAddress,
      toAddress: message.email,
      templateData,
    });
    try {
      await putEmailCopy({
        orderId,
        messageId,
        key,
        bucketName,
        kmsKeyId,
        templateName,
        fromAddress,
        status: 'sent',
        templateData,
      });
      console.info('order-email: stored email copy', { orderId, key });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      console.warn('order-email: failed to mark copy as sent', { orderId, reason });
    }
  }
}
