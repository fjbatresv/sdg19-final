import { DynamoDBStreamEvent } from 'aws-lambda';
/**
 * Publish new orders from the DynamoDB stream to SNS.
 */
export declare function orderStreamHandler(event: DynamoDBStreamEvent): Promise<void>;
//# sourceMappingURL=order-stream.d.ts.map