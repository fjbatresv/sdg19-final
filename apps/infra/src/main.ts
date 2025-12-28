import { App } from 'aws-cdk-lib';
import { PrimaryStack } from './stacks/primary-stack';
import { ReplicaStack } from './stacks/replica-stack';

const app = new App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const primaryRegion = 'us-east-1';
const replicaRegion = 'us-east-2';

const replicaStack = new ReplicaStack(app, 'Sdg19ReplicaStack', {
  env: { account, region: replicaRegion },
});

new PrimaryStack(app, 'Sdg19PrimaryStack', {
  env: { account, region: primaryRegion },
  crossRegionReferences: true,
  replicaBucket: replicaStack.replicaBucket,
  replicaBucketKey: replicaStack.replicaBucketKey,
});
