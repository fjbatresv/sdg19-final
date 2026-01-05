import { SQSEvent } from 'aws-lambda';
/**
 * Processes SQS order messages: sends a templated order confirmation via SES and stores a copy in S3.
 *
 * The handler validates each record, skips invalid messages, avoids resending when a copy is already marked `sent`,
 * and marks stored copies with `pending` then `sent` status as it progresses.
 *
 * @param event - The SQS event containing order message records to process
 */
export declare function orderEmailHandler(event: SQSEvent): Promise<void>;
//# sourceMappingURL=order-email.d.ts.map