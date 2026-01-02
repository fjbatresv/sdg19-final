import { describe, it, expect } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { PrimaryStack } from './primary-stack';
import { ReplicaStack } from './replica-stack';

const createApp = (context: Record<string, string> = {}) =>
  new App({
    context: {
      rootDomainName: 'example.com',
      createHostedZone: 'true',
      enableLambdaVpc: 'false',
      sesFromAddress: 'no-reply@example.com',
      sesMailFromDomain: 'mail.example.com',
      ...context,
    },
  });

describe('PrimaryStack', () => {
  it('provisions secure data resources', () => {
    const app = createApp();
    const replica = new ReplicaStack(app, 'Replica', {
      env: { account: '111111111111', region: 'us-east-2' },
    });
    const stack = new PrimaryStack(app, 'Primary', {
      env: { account: '111111111111', region: 'us-east-1' },
      crossRegionReferences: true,
      emailsReplicaBucket: replica.emailsReplicaBucket,
      emailsReplicaKmsKeyArn: replica.emailsReplicaKmsKeyArn,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      StreamSpecification: {
        StreamViewType: 'NEW_IMAGE',
      },
    });

    template.hasResourceProperties('AWS::SQS::Queue', {
      RedrivePolicy: Match.objectLike({
        maxReceiveCount: Match.anyValue(),
      }),
    });

    template.hasResourceProperties('AWS::Kinesis::Stream', {
      StreamModeDetails: {
        StreamMode: 'ON_DEMAND',
      },
      StreamEncryption: Match.objectLike({
        EncryptionType: 'KMS',
      }),
    });

    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: Match.anyValue(),
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        WebACLId: Match.anyValue(),
      }),
    });
  });

  it('throws when rootDomainName is missing', () => {
    const app = createApp({ rootDomainName: '' });
    const replica = new ReplicaStack(app, 'ReplicaMissingRoot', {
      env: { account: '111111111111', region: 'us-east-2' },
    });

    expect(
      () =>
        new PrimaryStack(app, 'PrimaryMissingRoot', {
          env: { account: '111111111111', region: 'us-east-1' },
          crossRegionReferences: true,
          emailsReplicaBucket: replica.emailsReplicaBucket,
          emailsReplicaKmsKeyArn: replica.emailsReplicaKmsKeyArn,
        })
    ).toThrowError(/rootDomainName is required/);
  });

  it('throws when hostedZoneId is missing and createHostedZone is false', () => {
    const app = createApp({ createHostedZone: 'false' });
    const replica = new ReplicaStack(app, 'ReplicaNoZone', {
      env: { account: '111111111111', region: 'us-east-2' },
    });

    expect(
      () =>
        new PrimaryStack(app, 'PrimaryNoZone', {
          env: { account: '111111111111', region: 'us-east-1' },
          crossRegionReferences: true,
          emailsReplicaBucket: replica.emailsReplicaBucket,
          emailsReplicaKmsKeyArn: replica.emailsReplicaKmsKeyArn,
        })
    ).toThrowError(/hostedZoneId is required/);
  });

  it('throws when SES configuration is missing', () => {
    const app = createApp({
      sesFromAddress: '',
      sesMailFromDomain: '',
    });
    const replica = new ReplicaStack(app, 'ReplicaNoSes', {
      env: { account: '111111111111', region: 'us-east-2' },
    });

    expect(
      () =>
        new PrimaryStack(app, 'PrimaryNoSes', {
          env: { account: '111111111111', region: 'us-east-1' },
          crossRegionReferences: true,
          emailsReplicaBucket: replica.emailsReplicaBucket,
          emailsReplicaKmsKeyArn: replica.emailsReplicaKmsKeyArn,
        })
    ).toThrowError(/sesFromAddress is required/);
  });

  it('creates resources when VPC is enabled and hosted zone is supplied', () => {
    const app = createApp({
      createHostedZone: 'false',
      hostedZoneId: 'Z123456789',
      enableLambdaVpc: 'true',
    });
    const replica = new ReplicaStack(app, 'ReplicaVpc', {
      env: { account: '111111111111', region: 'us-east-2' },
    });

    const stack = new PrimaryStack(app, 'PrimaryVpc', {
      env: { account: '111111111111', region: 'us-east-1' },
      crossRegionReferences: true,
      emailsReplicaBucket: replica.emailsReplicaBucket,
      emailsReplicaKmsKeyArn: replica.emailsReplicaKmsKeyArn,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::VPC', 1);
  });
});
