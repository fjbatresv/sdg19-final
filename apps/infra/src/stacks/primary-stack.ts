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
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  HttpApi,
  CorsHttpMethod,
  HttpMethod,
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
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'node:path';

interface PrimaryStackProps extends StackProps {
  emailsReplicaBucket: Bucket;
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

    const enableLambdaVpc =
      this.node.tryGetContext('enableLambdaVpc') ?? true;
    const useVpc = !(enableLambdaVpc === false || enableLambdaVpc === 'false');

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
    const ordersQueue = new Queue(this, 'OrdersQueue', {
      visibilityTimeout: Duration.seconds(30),
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

    apiLogs.grantWrite(new ServicePrincipal('apigateway.amazonaws.com'));

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
      timeout: Duration.seconds(10),
      ...lambdaVpcConfig,
    });

    const createOrderFn = new Function(this, 'CreateOrderFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.createOrderHandler',
      code: backendCode,
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

    table.grantReadWriteData(createOrderFn);
    table.grantReadData(listOrdersFn);
    table.grantStreamRead(orderStreamFn);
    ordersTopic.grantPublish(orderStreamFn);
    ordersTopic.addSubscription(
      new SqsSubscription(ordersQueue, {
        rawMessageDelivery: true,
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

    props.emailsReplicaBucket.grantWrite(replicationRole);

    const dataBucket = new Bucket(this, 'DataBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

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
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      replicationRole,
      replicationRules: [
        {
          priority: 1,
          destination: props.emailsReplicaBucket,
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
        },
      ],
    });

    const sesTemplateName =
      this.node.tryGetContext('sesTemplateName') ??
      'sdg19-order-confirmation';
    const sesFromAddress =
      this.node.tryGetContext('sesFromAddress') ?? `noreply@${rootDomainName}`;
    const sesMailFromDomain =
      this.node.tryGetContext('sesMailFromDomain') ??
      `mail.${rootDomainName}`;

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
              <p>Correo: {{email}}</p>
            </body>
          </html>
        `,
        textPart:
          'Gracias por tu orden {{orderId}}. Fecha: {{createdAt}}. Estado: {{status}}. Total: {{total}}. Correo: {{email}}.',
      },
    });

    const orderEmailFn = new Function(this, 'OrderEmailFn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.orderEmailHandler',
      code: backendCode,
      timeout: Duration.seconds(15),
      ...lambdaVpcConfig,
      environment: {
        EMAILS_BUCKET_NAME: emailsBucket.bucketName,
        SES_TEMPLATE_NAME: sesTemplateName,
        SES_FROM_ADDRESS: sesFromAddress,
      },
    });

    orderEmailFn.addEventSource(
      new SqsEventSource(ordersQueue, {
        batchSize: 10,
      })
    );

    emailsBucket.grantPut(orderEmailFn);
    sesIdentity.grantSendEmail(orderEmailFn);
    orderEmailFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['ses:SendTemplatedEmail'],
        resources: ['*'],
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
