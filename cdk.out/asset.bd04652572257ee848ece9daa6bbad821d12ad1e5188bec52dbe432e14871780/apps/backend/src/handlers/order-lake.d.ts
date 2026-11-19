import { SQSEvent } from 'aws-lambda';
/**
 * Process SQS records, validate order messages, and send valid orders to a Kinesis stream for the data lake.
 *
 * @param event - The SQS event containing records to process.
 * @returns An object with `batchItemFailures`, an array of entries each containing `itemIdentifier` for records that failed processing.
 * @throws Error If sending a record to Kinesis fails.
 */
export declare function orderLakeHandler(event: SQSEvent): Promise<{
    batchItemFailures: {
        itemIdentifier: string;
    }[];
}>;
//# sourceMappingURL=order-lake.d.ts.map