import { App, Tags } from 'aws-cdk-lib';
import { PrimaryStack } from './stacks/primary-stack';
import { ReplicaStack } from './stacks/replica-stack';

const app = new App();
Tags.of(app).add('project', 'sdg19-final');
Tags.of(app).add('reason', 'sdg19');

const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
if (!account) {
  throw new Error('CDK_DEFAULT_ACCOUNT or AWS_ACCOUNT_ID must be set.');
}
const primaryRegion = 'us-east-1';
const replicaRegion = 'us-east-2';

const replicaStack = new ReplicaStack(app, 'Sdg19ReplicaStack', {
  env: { account, region: replicaRegion },
});

new PrimaryStack(app, 'Sdg19PrimaryStack', {
  env: { account, region: primaryRegion },
  crossRegionReferences: true,
  emailsReplicaBucket: replicaStack.emailsReplicaBucket,
});
