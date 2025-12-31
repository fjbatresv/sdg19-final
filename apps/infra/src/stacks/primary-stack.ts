import {
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  CfnOutput,
  Fn,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc, SubnetType, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
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
import {
  Role,
  ServicePrincipal,
  PolicyStatement,
  Policy,
  AnyPrincipal,
  Effect,
} from 'aws-cdk-lib/aws-iam';
import {
  HttpApi,
  CorsHttpMethod,
  HttpMethod,
  LogGroupLogDestination,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AccessLogFormat } from 'aws-cdk-lib/aws-apigateway';
import {
  Function,
  Runtime,
  Code,
  StartingPosition,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  PublicHostedZone,
  HostedZone,
  IHostedZone,
  ARecord,
  RecordTarget,
} from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  Distribution,
  PriceClass,
  ResponseHeadersPolicy,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
  OriginProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import {
  HttpOrigin,
  S3BucketOrigin,
} from 'aws-cdk-lib/aws-cloudfront-origins';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { CfnTemplate } from 'aws-cdk-lib/aws-ses';
import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses';
import { Trail } from 'aws-cdk-lib/aws-cloudtrail';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import {
  Stream,
  StreamEncryption,
  StreamMode,
} from 'aws-cdk-lib/aws-kinesis';
import { CfnDatabase, CfnTable } from 'aws-cdk-lib/aws-glue';
import { CfnDeliveryStream } from 'aws-cdk-lib/aws-kinesisfirehose';
import {
  Alarm,
  ComparisonOperator,
  Metric,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import * as path from 'node:path';

interface PrimaryStackProps extends StackProps {
  emailsReplicaBucket: Bucket;
  emailsReplicaKmsKeyArn: string;
}

export class PrimaryStack extends Stack {
  constructor(scope: Construct, id: string, props: PrimaryStackProps) {
    super(scope, id, props);

    const rootDomainName =
      this.node.tryGetContext('rootDomainName') ?? process.env.ROOT_DOMAIN_NAME;
    if (!rootDomainName) {
      throw new Error(
        'rootDomainName is required. Set context rootDomainName or ROOT_DOMAIN_NAME.'
      );
    }
    const apiDomainName =
      this.node.tryGetContext('apiDomainName') ??
      process.env.API_DOMAIN_NAME ??
      `finalapi.${rootDomainName}`;
    const webDomainName =
      this.node.tryGetContext('webDomainName') ??
      process.env.WEB_DOMAIN_NAME ??
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

    const enableLambdaVpc =
      this.node.tryGetContext('enableLambdaVpc') ?? process.env.ENABLE_LAMBDA_VPC;
    const useVpc = !(enableLambdaVpc === false || enableLambdaVpc === 'false');

    const emailsReplicaKmsKeyArn = props.emailsReplicaKmsKeyArn;
    if (!emailsReplicaKmsKeyArn) {
      throw new Error(
        'emailsReplicaKmsKeyArn is required. Pass it from the replica stack.'
      );
    }
    const emailsReplicaKmsKey = Key.fromKeyArn(
      this,
      'EmailsReplicaKey',
      emailsReplicaKmsKeyArn
    );

    const vpc = useVpc
      ? new Vpc(this, 'Vpc', {
          maxAzs: 3,
          natGateways: 3,
        })
      : undefined;

    const lambdaSecurityGroup = useVpc
      ? new SecurityGroup(this, 'LambdaSecurityGroup', {
          vpc: vpc as Vpc,
          description: 'Security group for backend lambdas',
          allowAllOutbound: true,
        })
      : undefined;

    const lambdaVpcConfig = useVpc
      ? {
          vpc: vpc as Vpc,
          vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
          securityGroups: [lambdaSecurityGroup as SecurityGroup],
        }
      : {};

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

    const ordersTopic = new Topic(this, 'OrdersTopic', {
      masterKey: dataKey,
    });
    const orderEmailTimeoutSeconds = 15;
    const orderLakeTimeoutSeconds = 10;
    const ordersDlq = new Queue(this, 'OrdersQueueDLQ', {
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: dataKey,
    });
    const ordersQueue = new Queue(this, 'OrdersQueue', {
      visibilityTimeout: Duration.seconds(orderEmailTimeoutSeconds * 6),
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: dataKey,
      deadLetterQueue: {
        queue: ordersDlq,
        maxReceiveCount: 5,
      },
    });
    const lakeDlq = new Queue(this, 'OrdersLakeQueueDLQ', {
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: dataKey,
    });
    const ordersLakeQueue = new Queue(this, 'OrdersLakeQueue', {
      visibilityTimeout: Duration.seconds(orderLakeTimeoutSeconds * 6),
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: dataKey,
      deadLetterQueue: {
        queue: lakeDlq,
        maxReceiveCount: 5,
      },
    });

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
      retention: RetentionDays.ONE_MONTH,
    });

    apiLogs.addToResourcePolicy(
      new PolicyStatement({
        principals: [new ServicePrincipal('apigateway.amazonaws.com')],
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [apiLogs.logGroupArn, `${apiLogs.logGroupArn}:*`],
      })
    );

    const api = new HttpApi(this, 'HttpApi', {
      apiName: 'sdg19-api',
      createDefaultStage: false,
      corsPreflight: {
        allowHeaders: [
          'authorization',
          'content-type',
          'x-amz-date',
          'x-api-key',
          'x-amz-security-token',
          'x-amz-user-agent',
        ],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: [`https://${webDomainName}`],
      },
    });

    api.addStage('$default', {
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
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(10),
      ...lambdaVpcConfig,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    const loginFn = new Function(this, 'LoginFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.loginHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(10),
      ...lambdaVpcConfig,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    const refreshFn = new Function(this, 'RefreshFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.refreshHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(10),
      ...lambdaVpcConfig,
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    const productsFn = new Function(this, 'ProductsFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.productsHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(10),
      ...lambdaVpcConfig,
    });

    const createOrderFn = new Function(this, 'CreateOrderFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.createOrderHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(10),
      ...lambdaVpcConfig,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const listOrdersFn = new Function(this, 'ListOrdersFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.listOrdersHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(10),
      ...lambdaVpcConfig,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const orderStreamFn = new Function(this, 'OrderStreamFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.orderStreamHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(10),
      ...lambdaVpcConfig,
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

    createOrderFn.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:DeleteItem',
        ],
        resources: [table.tableArn, `${table.tableArn}/index/*`],
      })
    );
    listOrdersFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:Query'],
        resources: [table.tableArn, `${table.tableArn}/index/*`],
      })
    );
    if (table.tableStreamArn) {
      orderStreamFn.addToRolePolicy(
        new PolicyStatement({
          actions: [
            'dynamodb:DescribeStream',
            'dynamodb:GetRecords',
            'dynamodb:GetShardIterator',
            'dynamodb:ListStreams',
          ],
          resources: [table.tableStreamArn],
        })
      );
    }
    orderStreamFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['sns:Publish'],
        resources: [ordersTopic.topicArn],
      })
    );
    ordersTopic.addSubscription(
      new SqsSubscription(ordersQueue, {
        rawMessageDelivery: false,
      })
    );
    ordersTopic.addSubscription(
      new SqsSubscription(ordersLakeQueue, {
        rawMessageDelivery: false,
      })
    );

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

    const optionsFn = new Function(this, 'OptionsFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.optionsHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(5),
    });

    api.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.OPTIONS],
      integration: new HttpLambdaIntegration('OptionsIntegration', optionsFn),
    });

    const certificate = new Certificate(this, 'Certificate', {
      domainName: webDomainName,
      subjectAlternativeNames: [apiDomainName],
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const webBucket = new Bucket(this, 'WebBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
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

    const webCachePolicy = new CachePolicy(this, 'WebCachePolicy', {
      minTtl: Duration.hours(1),
      defaultTtl: Duration.days(7),
      maxTtl: Duration.days(365),
      cookieBehavior: CacheCookieBehavior.none(),
      headerBehavior: CacheHeaderBehavior.none(),
      queryStringBehavior: CacheQueryStringBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const productsCachePolicy = new CachePolicy(this, 'ProductsCachePolicy', {
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.minutes(1),
      maxTtl: Duration.minutes(5),
      cookieBehavior: CacheCookieBehavior.none(),
      headerBehavior: CacheHeaderBehavior.none(),
      queryStringBehavior: CacheQueryStringBehavior.all(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const apiCorsResponsePolicy = new ResponseHeadersPolicy(
      this,
      'ApiCorsResponsePolicy',
      {
        corsBehavior: {
          accessControlAllowOrigins: [`https://${webDomainName}`],
          accessControlAllowHeaders: [
            'authorization',
            'content-type',
            'x-amz-date',
            'x-api-key',
            'x-amz-security-token',
            'x-amz-user-agent',
          ],
          accessControlAllowMethods: ['GET', 'POST', 'OPTIONS'],
          accessControlAllowCredentials: false,
          accessControlMaxAge: Duration.hours(1),
          originOverride: true,
        },
      }
    );

    const distribution = new Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: webOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: webCachePolicy,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      domainNames: [webDomainName],
      certificate,
      webAclId: webAcl.attrArn,
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    const apiOriginDomain = Fn.select(2, Fn.split('/', api.apiEndpoint));
    const apiDistribution = new Distribution(this, 'ApiDistribution', {
      defaultBehavior: {
        origin: new HttpOrigin(apiOriginDomain, {
          protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        responseHeadersPolicy: apiCorsResponsePolicy,
      },
      additionalBehaviors: {
        '/products': {
          origin: new HttpOrigin(apiOriginDomain, {
            protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: productsCachePolicy,
          originRequestPolicy:
            OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy: apiCorsResponsePolicy,
        },
      },
      domainNames: [apiDomainName],
      certificate,
      webAclId: webAcl.attrArn,
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    new ARecord(this, 'WebAliasRecord', {
      zone: hostedZone,
      recordName: webDomainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: apiDomainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(apiDistribution)),
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

    // Replication role policy already grants required S3 actions.

    const dataBucket = new Bucket(this, 'DataBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const ordersStream = new Stream(this, 'OrdersStream', {
      streamMode: StreamMode.ON_DEMAND,
      encryption: StreamEncryption.KMS,
      encryptionKey: dataKey,
    });

    const dataLakeDatabase = new CfnDatabase(this, 'DataLakeDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: 'sdg19_data_lake',
      },
    });

    const dataLakeTable = new CfnTable(this, 'DataLakeOrdersTable', {
      catalogId: this.account,
      databaseName: dataLakeDatabase.ref,
      tableInput: {
        name: 'orders',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          classification: 'parquet',
        },
        partitionKeys: [
          { name: 'year', type: 'string' },
          { name: 'month', type: 'string' },
          { name: 'day', type: 'string' },
          { name: 'hour', type: 'string' },
        ],
        storageDescriptor: {
          columns: [
            { name: 'orderId', type: 'string' },
            { name: 'userPk', type: 'string' },
            { name: 'createdAt', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'total', type: 'double' },
            { name: 'items', type: 'string' },
          ],
          location: `s3://${dataBucket.bucketName}/data-lake/orders/`,
          inputFormat:
            'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
          outputFormat:
            'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
          serdeInfo: {
            serializationLibrary:
              'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
          },
        },
      },
    });
    dataLakeTable.addDependency(dataLakeDatabase);

    const firehoseRole = new Role(this, 'OrdersFirehoseRole', {
      roleName: 'OrdersFirehoseRole',
      assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
    });
    firehoseRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'kinesis:DescribeStream',
          'kinesis:DescribeStreamSummary',
        ],
        resources: [ordersStream.streamArn],
      })
    );
    firehoseRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'kinesis:GetShardIterator',
          'kinesis:GetRecords',
          'kinesis:ListShards',
        ],
        resources: [ordersStream.streamArn],
      })
    );
    firehoseRole.addToPolicy(
      new PolicyStatement({
        actions: [
          's3:AbortMultipartUpload',
          's3:GetBucketLocation',
          's3:GetObject',
          's3:ListBucket',
          's3:ListBucketMultipartUploads',
          's3:PutObject',
        ],
        resources: [dataBucket.bucketArn, `${dataBucket.bucketArn}/*`],
      })
    );
    firehoseRole.addToPolicy(
      new PolicyStatement({
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [dataKey.keyArn],
      })
    );
    firehoseRole.addToPolicy(
      new PolicyStatement({
        actions: ['glue:GetTable', 'glue:GetTableVersion', 'glue:GetTableVersions'],
        resources: [
          `arn:aws:glue:${this.region}:${this.account}:catalog`,
          `arn:aws:glue:${this.region}:${this.account}:database/${dataLakeDatabase.ref}`,
          `arn:aws:glue:${this.region}:${this.account}:table/${dataLakeDatabase.ref}/${dataLakeTable.ref}`,
        ],
      })
    );
    firehoseRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['*'],
      })
    );

    console.log('fireHoseRole', firehoseRole.policyFragment)

    const firehoseLogs = new LogGroup(this, 'OrdersFirehoseLogs', {
      retention: RetentionDays.ONE_MONTH,
    });

    const ordersFirehose = new CfnDeliveryStream(this, 'OrdersFirehose', {
      deliveryStreamType: 'KinesisStreamAsSource',
      deliveryStreamName: 'OrdersFireHose',
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: ordersStream.streamArn,
        roleArn: firehoseRole.roleArn,
      },
      extendedS3DestinationConfiguration: {
        bucketArn: dataBucket.bucketArn,
        roleArn: firehoseRole.roleArn,
        prefix:
          'data-lake/orders/!{partitionKeyFromQuery:year}/!{partitionKeyFromQuery:month}/!{partitionKeyFromQuery:day}/!{partitionKeyFromQuery:hour}/',
        errorOutputPrefix: 'data-lake/errors/',
        compressionFormat: 'UNCOMPRESSED',
        bufferingHints: {
          intervalInSeconds: 300,
          sizeInMBs: 64,
        },
        processingConfiguration: {
          enabled: true,
          processors: [
            {
              type: 'MetadataExtraction',
              parameters: [
                {
                  parameterName: 'MetadataExtractionQuery',
                  parameterValue:
                    '{year: .createdAt[0:4], month: .createdAt[5:7], day: .createdAt[8:10], hour: .createdAt[11:13]}',
                },
                {
                  parameterName: 'JsonParsingEngine',
                  parameterValue: 'JQ-1.6',
                },
              ],
            },
          ],
        },
        dynamicPartitioningConfiguration: {
          enabled: true,
          retryOptions: {
            durationInSeconds: 300,
          },
        },
        dataFormatConversionConfiguration: {
          enabled: true,
          inputFormatConfiguration: {
            deserializer: {
              openXJsonSerDe: {},
            },
          },
          outputFormatConfiguration: {
            serializer: {
              parquetSerDe: {},
            },
          },
          schemaConfiguration: {
            databaseName: dataLakeDatabase.ref,
            tableName: dataLakeTable.ref,
            roleArn: firehoseRole.roleArn,
            region: this.region,
            catalogId: this.account,
          },
        },
        cloudWatchLoggingOptions: {
          enabled: true,
          logGroupName: firehoseLogs.logGroupName,
          logStreamName: 'S3Delivery',
        },
      },
    });
    const firehoseRolePolicy = firehoseRole.node.findChild(
      'DefaultPolicy'
    ) as Policy;
    ordersFirehose.node.addDependency(firehoseRole);
    ordersFirehose.node.addDependency(firehoseRolePolicy);
    ordersFirehose.addDependency(dataLakeTable);

    const logsBucket = new Bucket(this, 'LogsBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: Duration.days(30),
        },
      ],
    });

    const emailsBucket = new Bucket(this, 'EmailsBucket', {
      versioned: true,
      encryption: BucketEncryption.KMS,
      encryptionKey: dataKey,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      replicationRole,
      replicationRules: [
        {
          priority: 1,
          destination: props.emailsReplicaBucket,
          kmsKey: emailsReplicaKmsKey,
          sseKmsEncryptedObjects: true,
          storageClass: StorageClass.INTELLIGENT_TIERING,
          deleteMarkerReplication: true,
        },
      ],
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: StorageClass.GLACIER,
              transitionAfter: Duration.days(365),
            },
          ],
          expiration: Duration.days(3650),
        },
      ],
    });

    emailsBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'DenyUnencryptedEmailUploads',
        effect: Effect.DENY,
        principals: [new AnyPrincipal()],
        actions: ['s3:PutObject'],
        resources: [`${emailsBucket.bucketArn}/*`],
        conditions: {
          StringNotEquals: {
            's3:x-amz-server-side-encryption': 'aws:kms',
          },
        },
      })
    );
    emailsBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'DenyWrongKmsKeyForEmailUploads',
        effect: Effect.DENY,
        principals: [new AnyPrincipal()],
        actions: ['s3:PutObject'],
        resources: [`${emailsBucket.bucketArn}/*`],
        conditions: {
          StringNotEquals: {
            's3:x-amz-server-side-encryption-aws-kms-key-id': dataKey.keyArn,
          },
        },
      })
    );

    const emailsBucketSizeMetric = new Metric({
      namespace: 'AWS/S3',
      metricName: 'BucketSizeBytes',
      dimensionsMap: {
        BucketName: emailsBucket.bucketName,
        StorageType: 'StandardStorage',
      },
      statistic: 'Average',
      period: Duration.days(1),
    });

    new Alarm(this, 'EmailsBucketSizeAlarm', {
      metric: emailsBucketSizeMetric,
      threshold: 5 * 1024 * 1024 * 1024,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    const sesTemplateName =
      this.node.tryGetContext('sesTemplateName') ??
      'sdg19-order-confirmation';
    const sesFromAddress =
      this.node.tryGetContext('sesFromAddress') ?? process.env.SES_FROM_ADDRESS;
    if (!sesFromAddress) {
      throw new Error(
        'sesFromAddress is required. Set context sesFromAddress or SES_FROM_ADDRESS.'
      );
    }
    const sesMailFromDomain =
      this.node.tryGetContext('sesMailFromDomain') ??
      process.env.SES_MAIL_FROM_DOMAIN ??
      `mail.${rootDomainName}`;
    if (!sesMailFromDomain) {
      throw new Error(
        'sesMailFromDomain is required. Set context sesMailFromDomain or SES_MAIL_FROM_DOMAIN.'
      );
    }

    const sesIdentity = new EmailIdentity(this, 'SesDomainIdentity', {
      identity: Identity.publicHostedZone(hostedZone),
      mailFromDomain: sesMailFromDomain,
    });

    new CfnTemplate(this, 'OrderEmailTemplate', {
      template: {
        templateName: sesTemplateName,
        subjectPart: 'Confirmación de orden {{orderId}}',
        htmlPart: `
          <html>
            <body style="font-family: Arial, sans-serif; color: #1f2933;">
              <h2>Gracias por tu orden</h2>
              <p>Orden: <strong>{{orderId}}</strong></p>
              <p>Fecha: {{createdAt}}</p>
              <p>Estado: {{status}}</p>
              <p>Total: {{total}}</p>
            </body>
          </html>
        `,
        textPart:
          'Gracias por tu orden {{orderId}}. Fecha: {{createdAt}}. Estado: {{status}}. Total: {{total}}.',
      },
    });

    const orderEmailFn = new Function(this, 'OrderEmailFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.orderEmailHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(orderEmailTimeoutSeconds),
      ...lambdaVpcConfig,
      environment: {
        EMAILS_BUCKET_NAME: emailsBucket.bucketName,
        SES_TEMPLATE_NAME: sesTemplateName,
        SES_FROM_ADDRESS: sesFromAddress,
        EMAILS_BUCKET_KMS_KEY_ID: dataKey.keyArn,
      },
    });

    const orderLakeFn = new Function(this, 'OrderLakeFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.orderLakeHandler',
      code: backendCode,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(orderLakeTimeoutSeconds),
      ...lambdaVpcConfig,
      environment: {
        KINESIS_STREAM_NAME: ordersStream.streamName,
      },
    });

    orderEmailFn.addEventSource(
      new SqsEventSource(ordersQueue, {
        batchSize: 10,
      })
    );
    orderLakeFn.addEventSource(
      new SqsEventSource(ordersLakeQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    );

    orderEmailFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [`${emailsBucket.bucketArn}/*`],
      })
    );
    orderEmailFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['kms:Encrypt', 'kms:GenerateDataKey'],
        resources: [dataKey.keyArn],
      })
    );
    orderEmailFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['ses:SendTemplatedEmail', 'ses:SendEmail'],
        resources: [sesIdentity.emailIdentityArn],
      })
    );
    orderLakeFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['kinesis:PutRecord', 'kinesis:PutRecords'],
        resources: [ordersStream.streamArn],
      })
    );
    orderLakeFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [dataKey.keyArn],
      })
    );

    const trailLogs = new LogGroup(this, 'CloudTrailLogs', {
      retention: RetentionDays.ONE_MONTH,
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
    new CfnOutput(this, 'EmailsBucketName', {
      value: emailsBucket.bucketName,
    });
    if (vpc) {
      new CfnOutput(this, 'VpcId', {
        value: vpc.vpcId,
      });
    }
  }
}
