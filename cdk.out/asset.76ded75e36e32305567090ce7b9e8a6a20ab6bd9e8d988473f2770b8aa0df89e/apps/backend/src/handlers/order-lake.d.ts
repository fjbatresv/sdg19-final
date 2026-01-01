import { SQSEvent } from 'aws-lambda';
/**
 * Ship order events to Kinesis for the data lake pipeline.
 */
export declare function orderLakeHandler(event: SQSEvent): Promise<{
    batchItemFailures: {
        itemIdentifier: string;
    }[];
}>;
//# sourceMappingURL=order-lake.d.ts.map