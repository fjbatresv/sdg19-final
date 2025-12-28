import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const client = new SNSClient({});

export async function publishOrder(topicArn: string, payload: unknown) {
  await client.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(payload),
    })
  );
}
