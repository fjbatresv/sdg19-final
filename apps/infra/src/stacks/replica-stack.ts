import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';

export class ReplicaStack extends Stack {
  public readonly emailsReplicaBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const emailsReplicaBucket = new Bucket(this, 'EmailsReplicaBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: StorageClass.GLACIER,
              transitionAfter: Duration.days(365),
            },
          ],
        },
      ],
    });

    this.emailsReplicaBucket = emailsReplicaBucket;

    new CfnOutput(this, 'EmailsReplicaBucketName', {
      value: emailsReplicaBucket.bucketName,
    });
  }
}
