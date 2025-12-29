import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
} from 'aws-cdk-lib/aws-s3';

export class ReplicaStack extends Stack {
  public readonly replicaBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const replicaBucket = new Bucket(this, 'ReplicaBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    this.replicaBucket = replicaBucket;

    new CfnOutput(this, 'ReplicaBucketName', {
      value: replicaBucket.bucketName,
    });
  }
}
