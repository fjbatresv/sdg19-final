import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
} from 'aws-cdk-lib/aws-s3';

export class ReplicaStack extends Stack {
  public readonly replicaBucket: Bucket;
  public readonly emailsReplicaBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const replicaBucket = new Bucket(this, 'ReplicaBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.replicaBucket = replicaBucket;

    const emailsReplicaBucket = new Bucket(this, 'EmailsReplicaBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: Duration.days(365),
        },
      ],
    });

    this.emailsReplicaBucket = emailsReplicaBucket;

    new CfnOutput(this, 'ReplicaBucketName', {
      value: replicaBucket.bucketName,
    });
    new CfnOutput(this, 'EmailsReplicaBucketName', {
      value: emailsReplicaBucket.bucketName,
    });
  }
}
