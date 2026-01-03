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
 * Produce a partially masked email address for safe logging.
 *
 * @param email - The email address to mask.
 * @returns The masked email with the local part reduced to its first two characters followed by `***` (or a single `*` if the local part is 1–2 characters), followed by `@` and the original domain; returns `"unknown"` if the input is not a valid `local@domain` address.
 */
function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return 'unknown';
  }
  const visible = local.length <= 2 ? '*' : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * Escape characters in a string to their corresponding HTML entities.
 *
 * @param value - The string to escape for safe inclusion in HTML
 * @returns The input string with `&`, `<`, `>`, `"`, `'`, and `/` replaced by their HTML entities
 */
function escapeHtml(value: string) {
  return value.replaceAll(/[&<>"'/]/g, (char) => {
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

/**
 * Validate that a value is a well-formed order message containing the required identifiers and types.
 *
 * @param payload - The value to validate as an order message
 * @returns `true` if `payload` is a `ValidOrderMessage` (has a non-empty `orderId`, a non-empty syntactically valid `email`, an optional `createdAt` that is parseable as a date if present, and an optional `total` that is a number if present), `false` otherwise.
 */
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
 * Check whether a value conforms to the OrderItem structure.
 *
 * @param value - The value to validate as an order item
 * @returns `true` if `value` has `productId` (string), `quantity` (number), and `unitPrice` (number); `false` otherwise.
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

/**
 * Build HTML table rows representing the provided order items for inclusion in an email template.
 *
 * @param items - Array of order items to render; each item's `productName` is used when present and non-empty, otherwise `productId` is used.
 * @returns A single HTML string containing concatenated table rows for the given items, with product names HTML-escaped and unit prices formatted as currency (dollars and cents).
 */
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

/**
 * Build the data object used to render the order email template.
 *
 * @param message - Validated order payload; `orderId`, `status`, `total`, and `userPk` are used to populate template fields
 * @param items - List of order items to include in the template's HTML line items
 * @returns An object with the following properties:
 * - `orderId`: the order identifier
 * - `status`: order status if provided
 * - `total`: total formatted as a currency string with two decimals (e.g., "12.34") or `undefined` if not present
 * - `userPk`: user partition key if provided
 * - `year`: the current year as a number
 * - `itemsHtml`: HTML string representing the order items
 */
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

/**
 * Build the S3 object key used to store an email copy for a specific order.
 *
 * @param orderId - The order identifier to include in the key
 * @param messageId - The message identifier to include in the key
 * @returns The S3 key in the form `orders/{orderId}/{messageId}.json`
 */
function buildEmailCopyKey(orderId: string, messageId: string) {
  return `orders/${orderId}/${messageId}.json`;
}

/**
 * Build the JSON body stored in S3 for an email copy of an order.
 *
 * @param orderId - The order identifier
 * @param messageId - The SQS/SNS message identifier used to name the copy
 * @param templateName - The SES template name used to render the email
 * @param fromAddress - The email address used as the message sender
 * @param status - The email copy status (`pending` or `sent`)
 * @param templateData - Template data supplied to the SES template
 * @returns An object with keys: `orderId`, `messageId`, `from`, `template`, `status`, `data`, and `updatedAt` (ISO 8601 timestamp)
 */
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

/**
 * Retrieve the stored email copy status for an order from S3.
 *
 * Reads the JSON object at the specified S3 key and returns its `status` when it equals `'pending'` or `'sent'`.
 *
 * @param bucketName - S3 bucket containing the email copy
 * @param orderId - Order identifier used for logging context
 * @param key - S3 object key of the email copy
 * @returns `'pending'` or `'sent'` when present in the stored object, `null` otherwise
 */
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

/**
 * Send an order email using an AWS SES template.
 *
 * @param params.orderId - Order identifier used for logging and error context.
 * @param params.templateName - SES template name to render.
 * @param params.fromAddress - Source (From) email address.
 * @param params.toAddress - Recipient email address.
 * @param params.templateData - Data object provided to the template for rendering.
 * @throws The error thrown by SES when the send operation fails; the original error is rethrown after being logged.
 */
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

/**
 * Store a JSON representation of an email copy (metadata and template data) in S3 using KMS encryption.
 *
 * @param params.orderId - The order identifier associated with this email copy.
 * @param params.messageId - The unique message identifier for the SQS/SNS message.
 * @param params.key - The S3 object key where the JSON will be written.
 * @param params.bucketName - The target S3 bucket name.
 * @param params.kmsKeyId - The KMS key ID used for server-side encryption of the object.
 * @param params.templateName - The SES template name referenced by this email copy.
 * @param params.fromAddress - The email address used as the message source.
 * @param params.status - The current email copy status (`'pending'` or `'sent'`).
 * @param params.templateData - The template data payload to include in the stored copy.
 *
 * @throws Propagates any error encountered while writing the object to S3.
 */
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
 * Processes SQS order messages: sends a templated order confirmation via SES and stores a copy in S3.
 *
 * The handler validates each record, skips invalid messages, avoids resending when a copy is already marked `sent`,
 * and marks stored copies with `pending` then `sent` status as it progresses.
 *
 * @param event - The SQS event containing order message records to process
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