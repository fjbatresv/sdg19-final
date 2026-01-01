"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// apps/backend/src/main.ts
var main_exports = {};
__export(main_exports, {
  createOrderHandler: () => createOrderHandler,
  listOrdersHandler: () => listOrdersHandler,
  loginHandler: () => loginHandler,
  optionsHandler: () => optionsHandler,
  orderEmailHandler: () => orderEmailHandler,
  orderStreamHandler: () => orderStreamHandler,
  productsHandler: () => productsHandler,
  refreshHandler: () => refreshHandler,
  registerHandler: () => registerHandler
});
module.exports = __toCommonJS(main_exports);

// apps/backend/src/lib/response.ts
function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

// apps/backend/src/lib/env.ts
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// apps/backend/src/lib/cognito.ts
var import_client_cognito_identity_provider = require("@aws-sdk/client-cognito-identity-provider");
var cognitoClient = new import_client_cognito_identity_provider.CognitoIdentityProviderClient({});
async function registerUser(input) {
  await cognitoClient.send(
    new import_client_cognito_identity_provider.SignUpCommand({
      ClientId: input.clientId,
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: "email", Value: input.email },
        ...input.name ? [{ Name: "name", Value: input.name }] : []
      ]
    })
  );
  await cognitoClient.send(
    new import_client_cognito_identity_provider.AdminConfirmSignUpCommand({
      UserPoolId: input.userPoolId,
      Username: input.email
    })
  );
}
async function loginUser(input) {
  const result = await cognitoClient.send(
    new import_client_cognito_identity_provider.InitiateAuthCommand({
      ClientId: input.clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: input.email,
        PASSWORD: input.password
      }
    })
  );
  return result.AuthenticationResult ?? {};
}
async function refreshUser(input) {
  const result = await cognitoClient.send(
    new import_client_cognito_identity_provider.InitiateAuthCommand({
      ClientId: input.clientId,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: input.refreshToken
      }
    })
  );
  return result.AuthenticationResult ?? {};
}

// apps/backend/src/handlers/auth.ts
function parseBody(event) {
  if (!event.body) {
    return null;
  }
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}
function getSubFromIdToken(idToken) {
  if (!idToken) {
    return void 0;
  }
  const parts = idToken.split(".");
  if (parts.length < 2) {
    return void 0;
  }
  try {
    const payload = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    const json = JSON.parse(decoded);
    return json.sub;
  } catch {
    return void 0;
  }
}
async function registerHandler(event) {
  const body = parseBody(event);
  if (!body?.email || !body?.password) {
    return jsonResponse(400, { message: "email y password son requeridos" });
  }
  const userPoolId = requireEnv("USER_POOL_ID");
  const clientId = requireEnv("USER_POOL_CLIENT_ID");
  try {
    await registerUser({
      clientId,
      userPoolId,
      email: body.email,
      password: body.password,
      name: body.name
    });
    const auth = await loginUser({
      clientId,
      email: body.email,
      password: body.password
    });
    return jsonResponse(201, {
      userId: getSubFromIdToken(auth.IdToken) ?? body.email,
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error registrando usuario";
    return jsonResponse(400, { message });
  }
}
async function loginHandler(event) {
  const body = parseBody(event);
  if (!body?.email || !body?.password) {
    return jsonResponse(400, { message: "email y password son requeridos" });
  }
  const clientId = requireEnv("USER_POOL_CLIENT_ID");
  try {
    const auth = await loginUser({
      clientId,
      email: body.email,
      password: body.password
    });
    if (!auth.AccessToken || !auth.IdToken) {
      return jsonResponse(401, { message: "Credenciales invalidas" });
    }
    return jsonResponse(200, {
      userId: getSubFromIdToken(auth.IdToken) ?? body.email,
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Credenciales invalidas";
    return jsonResponse(401, { message });
  }
}
async function refreshHandler(event) {
  const body = parseBody(event);
  if (!body?.refreshToken) {
    return jsonResponse(400, { message: "refreshToken es requerido" });
  }
  const clientId = requireEnv("USER_POOL_CLIENT_ID");
  try {
    const auth = await refreshUser({
      clientId,
      refreshToken: body.refreshToken
    });
    if (!auth.AccessToken || !auth.IdToken) {
      return jsonResponse(401, { message: "Token invalido" });
    }
    const response = {
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      expiresIn: auth.ExpiresIn
    };
    if (auth.RefreshToken) {
      response.refreshToken = auth.RefreshToken;
    }
    return jsonResponse(200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token invalido";
    return jsonResponse(401, { message });
  }
}

// apps/backend/src/lib/products.ts
var products = [
  {
    id: "prod-001",
    name: "Starter Pack",
    description: "Paquete inicial",
    price: 29.99,
    currency: "USD"
  },
  {
    id: "prod-002",
    name: "Pro Pack",
    description: "Paquete profesional",
    price: 59.99,
    currency: "USD"
  },
  {
    id: "prod-003",
    name: "Enterprise Pack",
    description: "Paquete empresarial",
    price: 129.99,
    currency: "USD"
  }
];

// apps/backend/src/handlers/products.ts
async function productsHandler(_event) {
  return jsonResponse(200, products);
}

// apps/backend/src/handlers/orders.ts
var import_node_crypto = require("node:crypto");
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");

// apps/backend/src/lib/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

// apps/backend/src/handlers/orders.ts
function getUserClaims(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) {
    return null;
  }
  return claims;
}
function parseBody2(event) {
  if (!event.body) {
    return null;
  }
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}
async function createOrderHandler(event) {
  const claims = getUserClaims(event);
  if (!claims?.sub) {
    return jsonResponse(401, { message: "No autorizado" });
  }
  const body = parseBody2(event);
  if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
    return jsonResponse(400, { message: "items es requerido" });
  }
  try {
    const orderItems = body.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Producto invalido: ${item.productId}`);
      }
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw new Error(`Cantidad invalida para ${item.productId}`);
      }
      return {
        productId: product.id,
        quantity,
        unitPrice: product.price
      };
    });
    const total = orderItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const orderId = (0, import_node_crypto.randomUUID)();
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const tableName = requireEnv("TABLE_NAME");
    const pk = `USER#${claims.sub}`;
    const order = {
      PK: pk,
      SK: `ORDER#${orderId}`,
      GSI1PK: pk,
      GSI1SK: `ORDER#${createdAt}`,
      orderId,
      status: "CREATED",
      createdAt,
      email: claims.email,
      items: orderItems,
      total
    };
    await docClient.send(
      new import_lib_dynamodb2.PutCommand({
        TableName: tableName,
        Item: order
      })
    );
    return jsonResponse(201, {
      orderId,
      status: order.status,
      createdAt,
      items: orderItems,
      total
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error creando orden";
    return jsonResponse(400, { message });
  }
}
async function listOrdersHandler(event) {
  const claims = getUserClaims(event);
  if (!claims?.sub) {
    return jsonResponse(401, { message: "No autorizado" });
  }
  try {
    const tableName = requireEnv("TABLE_NAME");
    const pk = `USER#${claims.sub}`;
    const result = await docClient.send(
      new import_lib_dynamodb2.QueryCommand({
        TableName: tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": pk
        },
        ScanIndexForward: false,
        Limit: 50
      })
    );
    const items = result.Items?.map((item) => ({
      orderId: item.orderId,
      status: item.status,
      createdAt: item.createdAt,
      items: item.items,
      total: item.total
    })) ?? [];
    return jsonResponse(200, items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error leyendo ordenes";
    return jsonResponse(500, { message });
  }
}

// apps/backend/src/handlers/order-stream.ts
var import_util_dynamodb = require("@aws-sdk/util-dynamodb");

// apps/backend/src/lib/sns.ts
var import_client_sns = require("@aws-sdk/client-sns");
var client2 = new import_client_sns.SNSClient({});
async function publishOrder(topicArn, payload) {
  await client2.send(
    new import_client_sns.PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(payload)
    })
  );
}

// apps/backend/src/handlers/order-stream.ts
async function orderStreamHandler(event) {
  const topicArn = requireEnv("ORDERS_TOPIC_ARN");
  for (const record of event.Records) {
    if (record.eventName !== "INSERT" || !record.dynamodb?.NewImage) {
      continue;
    }
    const image = (0, import_util_dynamodb.unmarshall)(
      record.dynamodb.NewImage
    );
    if (typeof image.SK !== "string" || !image.SK.startsWith("ORDER#")) {
      continue;
    }
    await publishOrder(topicArn, {
      orderId: image.orderId,
      userPk: image.PK,
      createdAt: image.createdAt,
      total: image.total,
      items: image.items,
      email: image.email,
      status: image.status
    });
  }
}

// apps/backend/src/handlers/options.ts
async function optionsHandler(_event) {
  return {
    statusCode: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type,x-amz-date,x-api-key,x-amz-security-token,x-amz-user-agent",
      "access-control-allow-methods": "GET,POST,OPTIONS"
    },
    body: ""
  };
}

// apps/backend/src/handlers/order-email.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var import_client_ses = require("@aws-sdk/client-ses");
var s3 = new import_client_s3.S3Client({});
var ses = new import_client_ses.SESClient({});
function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "unknown";
  }
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
function parseOrderMessage(body) {
  try {
    const parsed = JSON.parse(body);
    if (parsed?.Message) {
      return JSON.parse(parsed.Message);
    }
    return parsed;
  } catch {
    return null;
  }
}
async function orderEmailHandler(event) {
  const bucketName = requireEnv("EMAILS_BUCKET_NAME");
  const templateName = requireEnv("SES_TEMPLATE_NAME");
  const fromAddress = requireEnv("SES_FROM_ADDRESS");
  for (const record of event.Records) {
    const message = parseOrderMessage(record.body);
    if (!message?.email) {
      console.warn("order-email: skipped message without email", {
        orderId: message?.orderId ?? "unknown"
      });
      continue;
    }
    const orderId = message.orderId ?? "unknown";
    const recipient = maskEmail(message.email);
    console.info("order-email: sending confirmation", {
      orderId,
      recipient,
      status: message.status ?? "unknown"
    });
    const templateData = JSON.stringify({
      orderId: message.orderId,
      createdAt: message.createdAt,
      status: message.status,
      total: message.total,
      items: message.items,
      userPk: message.userPk,
      email: message.email
    });
    try {
      await ses.send(
        new import_client_ses.SendTemplatedEmailCommand({
          Source: fromAddress,
          Destination: { ToAddresses: [message.email] },
          Template: templateName,
          TemplateData: templateData
        })
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      console.error("order-email: SES send failed", { orderId, reason });
      throw error;
    }
    const key = `orders/${message.orderId ?? "unknown"}/${Date.now()}.json`;
    try {
      await s3.send(
        new import_client_s3.PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: "application/json",
          Body: JSON.stringify({
            to: message.email,
            from: fromAddress,
            template: templateName,
            data: JSON.parse(templateData)
          })
        })
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      console.error("order-email: S3 write failed", { orderId, reason });
      throw error;
    }
    console.info("order-email: stored email copy", { orderId, key });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createOrderHandler,
  listOrdersHandler,
  loginHandler,
  optionsHandler,
  orderEmailHandler,
  orderStreamHandler,
  productsHandler,
  refreshHandler,
  registerHandler
});
