import { SQSEvent } from 'aws-lambda';
/**
 * Send SES templated email for each order message and store a copy in S3.
 */
export declare function orderEmailHandler(event: SQSEvent): Promise<void>;
//# sourceMappingURL=order-email.d.ts.map