import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
} from 'aws-cdk-lib/aws-s3';
import { Key } from 'aws-cdk-lib/aws-kms';
import { PolicyDocument, PolicyStatement, Effect, AccountRootPrincipal } from 'aws-cdk-lib/aws-iam';

export class ReplicaStack extends Stack {
  public readonly replicaBucket: Bucket;
  public readonly replicaBucketKey: Key;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const replicaKey = new Key(this, 'ReplicaBucketKey', {
      enableKeyRotation: true,
      description: 'KMS key for replica bucket encryption',
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [new AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [new AccountRootPrincipal()],
            actions: [
              'kms:Decrypt',
              'kms:GenerateDataKey',
              'kms:CreateGrant',
              'kms:DescribeKey'
            ],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'kms:ViaService': `s3.${this.region}.amazonaws.com`
              }
            }
          })
        ],
      }),
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
