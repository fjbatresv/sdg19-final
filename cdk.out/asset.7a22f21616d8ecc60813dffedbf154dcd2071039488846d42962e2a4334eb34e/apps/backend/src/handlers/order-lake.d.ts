import { SQSEvent } from 'aws-lambda';
export declare function orderLakeHandler(event: SQSEvent): Promise<{
    batchItemFailures: {
        itemIdentifier: string;
    }[];
}>;
//# sourceMappingURL=order-lake.d.ts.map