import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import { Key } from 'aws-cdk-lib/aws-kms';

export class ReplicaStack extends Stack {
  public readonly emailsReplicaBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const replicaKey = new Key(this, 'EmailsReplicaKey', {
      enableKeyRotation: true,
    });

    const emailsReplicaBucket = new Bucket(this, 'EmailsReplicaBucket', {
      versioned: true,
      encryption: BucketEncryption.KMS,
      encryptionKey: replicaKey,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: StorageClass.INTELLIGENT_TIERING,
              transitionAfter: Duration.days(365),
            },
          ],
          expiration: Duration.days(3650),
        },
      ],
    });

    this.emailsReplicaBucket = emailsReplicaBucket;

    new CfnOutput(this, 'EmailsReplicaBucketName', {
      value: emailsReplicaBucket.bucketName,
    });
    new CfnOutput(this, 'EmailsReplicaKmsKeyArn', {
      value: replicaKey.keyArn,
    });
  }
}
