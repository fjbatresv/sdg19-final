import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
} from 'aws-cdk-lib/aws-s3';
import { Key } from 'aws-cdk-lib/aws-kms';

export class ReplicaStack extends Stack {
  public readonly replicaBucket: Bucket;
  public readonly replicaBucketKey: Key;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const replicaKey = new Key(this, 'ReplicaBucketKey', {
      enableKeyRotation: true,
    });

    const replicaBucket = new Bucket(this, 'ReplicaBucket', {
      versioned: true,
      encryption: BucketEncryption.KMS,
      encryptionKey: replicaKey,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    this.replicaBucket = replicaBucket;
    this.replicaBucketKey = replicaKey;

    new CfnOutput(this, 'ReplicaBucketName', {
      value: replicaBucket.bucketName,
    });
  }
}
