import {
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import { Key } from 'aws-cdk-lib/aws-kms';
import {
  Table,
  AttributeType,
  BillingMode,
  TableEncryption,
  ProjectionType,
  StreamViewType,
} from 'aws-cdk-lib/aws-dynamodb';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
  UserPool,
  UserPoolClient,
  AccountRecovery,
} from 'aws-cdk-lib/aws-cognito';
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  HttpApi,
  CorsHttpMethod,
  HttpMethod,
  DomainName,
  ApiMapping,
  HttpStage,
  LogGroupLogDestination,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AccessLogFormat } from 'aws-cdk-lib/aws-apigateway';
import { Function, Runtime, Code, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  PublicHostedZone,
  HostedZone,
  IHostedZone,
  ARecord,
  RecordTarget,
} from 'aws-cdk-lib/aws-route53';
import {
  CloudFrontTarget,
  ApiGatewayv2DomainProperties,
} from 'aws-cdk-lib/aws-route53-targets';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Trail } from 'aws-cdk-lib/aws-cloudtrail';
import * as path from 'path';

interface PrimaryStackProps extends StackProps {
  replicaBucket: Bucket;
}

export class PrimaryStack extends Stack {
  constructor(scope: Construct, id: string, props: PrimaryStackProps) {
    super(scope, id, props);

    const rootDomainName =
      this.node.tryGetContext('rootDomainName') ?? 'javierba3.com';
    const apiDomainName =
      this.node.tryGetContext('apiDomainName') ??
      `finalapi.${rootDomainName}`;
    const webDomainName =
      this.node.tryGetContext('webDomainName') ??
      `finalweb.${rootDomainName}`;
    const hostedZoneId = this.node.tryGetContext('hostedZoneId') as
      | string
      | undefined;
    const createHostedZone =
      (this.node.tryGetContext('createHostedZone') as string | undefined) ===
      'true';

    let hostedZone: IHostedZone;
    if (createHostedZone) {
      hostedZone = new PublicHostedZone(this, 'HostedZone', {
        zoneName: rootDomainName,
      });
    } else {
      if (!hostedZoneId) {
        throw new Error(
          'hostedZoneId is required unless createHostedZone=true in context.'
        );
      }
      hostedZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId,
        zoneName: rootDomainName,
      });
    }

    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 3,
      natGateways: 3,
    });

    const dataKey = new Key(this, 'DataKey', {
      enableKeyRotation: true,
    });

    const table = new Table(this, 'MainTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: dataKey,
      stream: StreamViewType.NEW_IMAGE,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    const ordersTopic = new Topic(this, 'OrdersTopic');

    const userPool = new UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: false },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    const apiLogs = new LogGroup(this, 'ApiAccessLogs', {
      retention: RetentionDays.ONE_YEAR,
    });

    apiLogs.grantWrite(new ServicePrincipal('apigateway.amazonaws.com'));

    const api = new HttpApi(this, 'HttpApi', {
      apiName: 'sdg19-api',
      createDefaultStage: false,
      corsPreflight: {
        allowHeaders: ['authorization', 'content-type'],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
      },
    });

    const apiStage = new HttpStage(this, 'ApiStage', {
      httpApi: api,
      stageName: '$default',
      autoDeploy: true,
      accessLogSettings: {
        destination: new LogGroupLogDestination(apiLogs),
        format: AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      },
    });

    const authorizer = new HttpJwtAuthorizer(
      'UserPoolJwtAuthorizer',
      userPool.userPoolProviderUrl,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      }
    );

    const backendCode = Code.fromAsset(
      path.resolve(process.cwd(), 'apps/backend/dist')
    );

    const registerFn = new Function(this, 'RegisterFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.registerHandler',
      code: backendCode,
      timeout: Duration.seconds(10),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    const loginFn = new Function(this, 'LoginFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.loginHandler',
      code: backendCode,
      timeout: Duration.seconds(10),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    const refreshFn = new Function(this, 'RefreshFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.refreshHandler',
      code: backendCode,
      timeout: Duration.seconds(10),
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    const productsFn = new Function(this, 'ProductsFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.productsHandler',
      code: backendCode,
      timeout: Duration.seconds(10),
    });

    const createOrderFn = new Function(this, 'CreateOrderFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.createOrderHandler',
      code: backendCode,
      timeout: Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const listOrdersFn = new Function(this, 'ListOrdersFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.listOrdersHandler',
      code: backendCode,
      timeout: Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const orderStreamFn = new Function(this, 'OrderStreamFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.orderStreamHandler',
      code: backendCode,
      timeout: Duration.seconds(10),
      environment: {
        ORDERS_TOPIC_ARN: ordersTopic.topicArn,
      },
    });

    orderStreamFn.addEventSource(
      new DynamoEventSource(table, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 10,
      })
    );

    table.grantReadWriteData(createOrderFn);
    table.grantReadData(listOrdersFn);
    table.grantStreamRead(orderStreamFn);
    ordersTopic.grantPublish(orderStreamFn);

    registerFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['cognito-idp:SignUp', 'cognito-idp:AdminConfirmSignUp'],
        resources: [userPool.userPoolArn],
      })
    );

    loginFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['cognito-idp:InitiateAuth'],
        resources: [userPool.userPoolArn],
      })
    );

    refreshFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['cognito-idp:InitiateAuth'],
        resources: [userPool.userPoolArn],
      })
    );

    api.addRoutes({
      path: '/auth/register',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('RegisterIntegration', registerFn),
    });

    api.addRoutes({
      path: '/auth/login',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('LoginIntegration', loginFn),
    });

    api.addRoutes({
      path: '/auth/refresh',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('RefreshIntegration', refreshFn),
    });

    api.addRoutes({
      path: '/products',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('ProductsIntegration', productsFn),
    });

    api.addRoutes({
      path: '/orders',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'CreateOrderIntegration',
        createOrderFn
      ),
      authorizer,
    });

    api.addRoutes({
      path: '/orders',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'ListOrdersIntegration',
        listOrdersFn
      ),
      authorizer,
    });

    const certificate = new Certificate(this, 'Certificate', {
      domainName: webDomainName,
      subjectAlternativeNames: [apiDomainName],
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const apiDomain = new DomainName(this, 'ApiDomainName', {
      domainName: apiDomainName,
      certificate,
    });

    new ApiMapping(this, 'ApiMapping', {
      api,
      domainName: apiDomain,
      stage: apiStage,
    });

    new ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: apiDomainName,
      target: RecordTarget.fromAlias(
        new ApiGatewayv2DomainProperties(
          apiDomain.regionalDomainName,
          apiDomain.regionalHostedZoneId
        )
      ),
    });

    const webBucket = new Bucket(this, 'WebBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const webOrigin = S3BucketOrigin.withOriginAccessControl(webBucket);

    const webAcl = new CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'web-acl',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 0,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'aws-common-rules',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    const distribution = new Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: webOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [webDomainName],
      certificate,
      webAclId: webAcl.attrArn,
    });

    new ARecord(this, 'WebAliasRecord', {
      zone: hostedZone,
      recordName: webDomainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    const replicationRole = new Role(this, 'ReplicationRole', {
      assumedBy: new ServicePrincipal('s3.amazonaws.com'),
      roleName: `${this.stackName}-replication-role`,
    });

    replicationRole.addToPolicy(
      new PolicyStatement({
        actions: [
          's3:GetReplicationConfiguration',
          's3:ListBucket',
          's3:GetObjectVersionForReplication',
          's3:GetObjectVersionAcl',
          's3:GetObjectVersionTagging',
          's3:GetObjectRetention',
          's3:GetObjectLegalHold',
        ],
        resources: ['*'],
      })
    );

    replicationRole.addToPolicy(
      new PolicyStatement({
        actions: [
          's3:ReplicateObject',
          's3:ReplicateDelete',
          's3:ReplicateTags',
          's3:ObjectOwnerOverrideToBucketOwner',
        ],
        resources: ['*'],
      })
    );

    props.replicaBucket.grantWrite(replicationRole);

    const dataBucket = new Bucket(this, 'DataBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      replicationRole,
      replicationRules: [
        {
          priority: 1,
          destination: props.replicaBucket,
          storageClass: StorageClass.INTELLIGENT_TIERING,
          deleteMarkerReplication: true,
        },
      ],
    });

    const logsBucket = new Bucket(this, 'LogsBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          expiration: Duration.days(365),
        },
      ],
    });

    const trailLogs = new LogGroup(this, 'CloudTrailLogs', {
      retention: RetentionDays.ONE_YEAR,
    });

    new Trail(this, 'CloudTrail', {
      bucket: logsBucket,
      cloudWatchLogGroup: trailLogs,
      sendToCloudWatchLogs: true,
      enableFileValidation: true,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
    });

    new CfnOutput(this, 'ApiUrl', {
      value: api.apiEndpoint,
    });
    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });
    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, 'TableName', {
      value: table.tableName,
    });
    new CfnOutput(this, 'WebBucketName', {
      value: webBucket.bucketName,
    });
    new CfnOutput(this, 'WebDistributionId', {
      value: distribution.distributionId,
    });
    new CfnOutput(this, 'DataBucketName', {
      value: dataBucket.bucketName,
    });
    new CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
    });
  }
}
