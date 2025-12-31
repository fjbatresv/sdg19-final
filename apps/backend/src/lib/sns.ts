import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const client = new SNSClient({});

/**
 * Publish an order payload to SNS.
 */
export async function publishOrder(topicArn: string, payload: unknown) {
  await client.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(payload),
    })
  );
}
