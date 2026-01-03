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
  orderLakeHandler: () => orderLakeHandler,
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
var PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
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
  if (body.password.length < 10) {
    return jsonResponse(400, {
      message: "La contrase\xF1a debe tener al menos 10 caracteres"
    });
  }
  if (!PASSWORD_POLICY.test(body.password)) {
    return jsonResponse(400, {
      message: "La contrase\xF1a debe incluir may\xFAsculas, min\xFAsculas, n\xFAmeros y un s\xEDmbolo"
    });
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
    price: 2999,
    currency: "USD",
    availableQuantity: 25
  },
  {
    id: "prod-002",
    name: "Pro Pack",
    description: "Paquete profesional",
    price: 5999,
    currency: "USD",
    availableQuantity: 12
  },
  {
    id: "prod-003",
    name: "Enterprise Pack",
    description: "Paquete empresarial",
    price: 12999,
    currency: "USD",
    availableQuantity: 4
  }
];

// apps/backend/src/handlers/products.ts
async function productsHandler(event) {
  const limitParam = event.queryStringParameters?.limit;
  const nextTokenParam = event.queryStringParameters?.nextToken;
  const limit = limitParam ? Number(limitParam) : 20;
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return jsonResponse(400, { message: "Parametros de paginacion invalidos" });
  }
  let start = 0;
  if (nextTokenParam) {
    try {
      const decoded = Buffer.from(nextTokenParam, "base64").toString("utf8");
      start = Number(decoded);
      if (!Number.isFinite(start)) {
        throw new TypeError("Invalid token");
      }
    } catch {
      return jsonResponse(400, { message: "Parametros de paginacion invalidos" });
    }
  }
  if (start < 0 || start > products.length) {
    return jsonResponse(400, { message: "Parametros de paginacion invalidos" });
  }
  const items = products.slice(start, start + limit);
  const nextToken = start + items.length < products.length ? Buffer.from(String(start + items.length)).toString("base64") : void 0;
  return jsonResponse(200, {
    items,
    limit,
    nextToken,
    returnedCount: items.length
  });
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
var EXCLUSIVE_START_KEY_FIELDS = ["PK", "SK", "GSI1PK", "GSI1SK"];
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
function parseExclusiveStartKey(token) {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const keys = Object.keys(parsed);
    if (keys.length !== EXCLUSIVE_START_KEY_FIELDS.length) {
      return null;
    }
    for (const key of EXCLUSIVE_START_KEY_FIELDS) {
      if (!Object.hasOwn(parsed, key)) {
        return null;
      }
      const value = parsed[key];
      if (typeof value !== "string" || value.trim().length === 0) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}
var MAX_ITEM_QUANTITY = Number(process.env.MAX_ITEM_QUANTITY ?? 1e3);
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
    let orderCurrency;
    const orderItems = body.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Producto invalido: ${item.productId}`);
      }
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
        throw new Error(
          `Cantidad invalida para ${item.productId}. Maximo ${MAX_ITEM_QUANTITY}.`
        );
      }
      if (!orderCurrency) {
        orderCurrency = product.currency;
      } else if (product.currency !== orderCurrency) {
        throw new Error("Todos los productos deben usar la misma moneda");
      }
      return {
        productId: product.id,
        productName: product.name,
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
      total,
      currency: orderCurrency ?? "USD"
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
      total,
      currency: order.currency
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
  const limitParam = event.queryStringParameters?.limit;
  const nextTokenParam = event.queryStringParameters?.nextToken;
  const limit = limitParam ? Number(limitParam) : 20;
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return jsonResponse(400, { message: "Parametros de paginacion invalidos" });
  }
  let exclusiveStartKey;
  if (nextTokenParam) {
    const parsedKey = parseExclusiveStartKey(nextTokenParam);
    if (!parsedKey) {
      return jsonResponse(400, { message: "Parametros de paginacion invalidos" });
    }
    exclusiveStartKey = parsedKey;
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
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      })
    );
    const items = result.Items?.map((item) => ({
      orderId: item.orderId,
      status: item.status,
      createdAt: item.createdAt,
      items: item.items,
      total: item.total,
      currency: item.currency ?? "USD"
    })) ?? [];
    const nextToken = result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64") : void 0;
    return jsonResponse(200, {
      items,
      limit,
      nextToken,
      returnedCount: items.length
    });
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
async function optionsHandler(event) {
  const origin = event.headers?.origin ?? event.headers?.Origin;
  const webDomain = process.env.WEB_DOMAIN_NAME;
  const allowedOrigin = webDomain ? `https://${webDomain}` : void 0;
  const responseOrigin = allowedOrigin && origin === allowedOrigin ? origin : allowedOrigin ?? "*";
  return {
    statusCode: 204,
    headers: {
      "access-control-allow-origin": responseOrigin,
      "access-control-allow-headers": "authorization,content-type,x-amz-date,x-api-key,x-amz-security-token,x-amz-user-agent",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-max-age": "86400"
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
  const visible = local.length <= 2 ? "*" : local.slice(0, 2);
  return `${visible}***@${domain}`;
}
function escapeHtml(value) {
  return value.replace(/[&<>"'/]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      case "/":
        return "&#x2F;";
      default:
        return char;
    }
  });
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
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidOrderMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const message = payload;
  if (typeof message.orderId !== "string" || message.orderId.trim().length === 0) {
    return false;
  }
  if (typeof message.email !== "string" || message.email.trim().length === 0) {
    return false;
  }
  if (!EMAIL_REGEX.test(message.email)) {
    return false;
  }
  if (message.createdAt !== void 0 && (typeof message.createdAt !== "string" || Number.isNaN(Date.parse(message.createdAt)))) {
    return false;
  }
  if (message.total !== void 0 && typeof message.total !== "number") {
    return false;
  }
  return true;
}
function isOrderItem(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value;
  return typeof item.productId === "string" && typeof item.quantity === "number" && typeof item.unitPrice === "number";
}
function buildItemsHtml(items) {
  return items.map((item) => {
    const displayNameRaw = item.productName?.trim() ? item.productName : item.productId;
    const displayName = escapeHtml(displayNameRaw);
    const unitPrice = (item.unitPrice / 100).toFixed(2);
    return `<tr>
              <td style="padding:14px 14px;background:#fcfcfd;border:1px solid #eaecf0;border-radius:12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:800;color:#101828;">
                      ${displayName}
                    </td>
                    <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#475467;">
                      x${item.quantity}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#667085;">
                      Precio unitario
                    </td>
                    <td align="right" style="padding-top:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#667085;">
                      $ ${unitPrice}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
  }).join("");
}
function buildTemplateData(message, items) {
  const formattedTotal = typeof message.total === "number" ? (message.total / 100).toFixed(2) : void 0;
  return {
    orderId: message.orderId,
    status: message.status,
    total: formattedTotal,
    userPk: message.userPk,
    year: (/* @__PURE__ */ new Date()).getFullYear(),
    itemsHtml: buildItemsHtml(items)
  };
}
function buildEmailCopyKey(orderId, messageId) {
  return `orders/${orderId}/${messageId}.json`;
}
function buildEmailCopyBody(params) {
  const { orderId, messageId, templateName, fromAddress, status, templateData } = params;
  return {
    orderId,
    messageId,
    from: fromAddress,
    template: templateName,
    status,
    data: templateData,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function getEmailCopyStatus(params) {
  const { bucketName, orderId, key } = params;
  try {
    const { Body } = await s3.send(
      new import_client_s3.GetObjectCommand({
        Bucket: bucketName,
        Key: key
      })
    );
    if (!Body || typeof Body !== "object" || !("transformToString" in Body)) {
      return null;
    }
    const raw = await Body.transformToString();
    const parsed = JSON.parse(raw);
    return parsed.status === "pending" || parsed.status === "sent" ? parsed.status : null;
  } catch (error) {
    if (error && typeof error === "object" && "name" in error) {
      const name = error.name;
      if (name === "NoSuchKey") {
        return null;
      }
    }
    const reason = error instanceof Error ? error.message : "unknown";
    console.warn("order-email: unable to read email copy status", {
      orderId,
      reason
    });
    return null;
  }
}
async function sendOrderEmail(params) {
  const { orderId, templateName, fromAddress, toAddress, templateData } = params;
  try {
    await ses.send(
      new import_client_ses.SendTemplatedEmailCommand({
        Source: fromAddress,
        Destination: { ToAddresses: [toAddress] },
        Template: templateName,
        TemplateData: JSON.stringify(templateData)
      })
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error("order-email: SES send failed", { orderId, reason });
    throw error;
  }
}
async function putEmailCopy(params) {
  const {
    orderId,
    messageId,
    key,
    bucketName,
    kmsKeyId,
    templateName,
    fromAddress,
    status,
    templateData
  } = params;
  try {
    await s3.send(
      new import_client_s3.PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: "application/json",
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: kmsKeyId,
        Body: JSON.stringify({
          ...buildEmailCopyBody({
            orderId,
            messageId,
            templateName,
            fromAddress,
            status,
            templateData
          })
        })
      })
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error("order-email: S3 write failed", { orderId, reason });
    throw error;
  }
}
async function orderEmailHandler(event) {
  const bucketName = requireEnv("EMAILS_BUCKET_NAME");
  const templateName = requireEnv("SES_TEMPLATE_NAME");
  const fromAddress = requireEnv("SES_FROM_ADDRESS");
  const kmsKeyId = requireEnv("EMAILS_BUCKET_KMS_KEY_ID");
  for (const record of event.Records) {
    const message = parseOrderMessage(record.body);
    if (!isValidOrderMessage(message)) {
      console.warn("order-email: invalid message payload", {
        messageId: record.messageId
      });
      continue;
    }
    const orderId = message.orderId;
    const messageId = record.messageId;
    const key = buildEmailCopyKey(orderId, messageId);
    const items = Array.isArray(message.items) ? message.items.filter(isOrderItem) : [];
    const recipient = maskEmail(message.email);
    console.info("order-email: sending confirmation", {
      orderId,
      recipient,
      status: message.status ?? "unknown"
    });
    const templateData = buildTemplateData(message, items);
    const existingStatus = await getEmailCopyStatus({
      bucketName,
      orderId,
      key
    });
    if (existingStatus === "sent") {
      console.info("order-email: copy already marked sent", { orderId, key });
      continue;
    }
    if (!existingStatus) {
      await putEmailCopy({
        orderId,
        messageId,
        key,
        bucketName,
        kmsKeyId,
        templateName,
        fromAddress,
        status: "pending",
        templateData
      });
    }
    await sendOrderEmail({
      orderId,
      templateName,
      fromAddress,
      toAddress: message.email,
      templateData
    });
    try {
      await putEmailCopy({
        orderId,
        messageId,
        key,
        bucketName,
        kmsKeyId,
        templateName,
        fromAddress,
        status: "sent",
        templateData
      });
      console.info("order-email: stored email copy", { orderId, key });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      console.warn("order-email: failed to mark copy as sent", { orderId, reason });
    }
  }
}

// apps/backend/src/handlers/order-lake.ts
var import_client_kinesis = require("@aws-sdk/client-kinesis");
var kinesis = new import_client_kinesis.KinesisClient({
  region: process.env.AWS_REGION || "us-east-1"
});
var ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
function parseOrderMessage2(body) {
  try {
    const parsed = JSON.parse(body);
    if (parsed?.Message) {
      return JSON.parse(parsed.Message);
    }
    return parsed;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.warn("order-lake: failed to parse message", { reason, body });
    return null;
  }
}
function isValidOrderMessage2(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const message = payload;
  if (typeof message.orderId !== "string" || message.orderId.trim().length === 0) {
    return false;
  }
  if (message.createdAt !== void 0 && (typeof message.createdAt !== "string" || !ISO_8601_REGEX.test(message.createdAt))) {
    return false;
  }
  if (message.total !== void 0 && typeof message.total !== "number") {
    return false;
  }
  return true;
}
async function orderLakeHandler(event) {
  const streamName = requireEnv("KINESIS_STREAM_NAME");
  const batchItemFailures = [];
  for (const record of event.Records) {
    const message = parseOrderMessage2(record.body);
    if (!isValidOrderMessage2(message)) {
      console.warn("order-lake: invalid message payload", {
        messageId: record.messageId
      });
      continue;
    }
    const items = message.items === void 0 ? void 0 : JSON.stringify(message.items);
    const payload = {
      orderId: message.orderId,
      createdAt: message.createdAt,
      status: message.status,
      total: message.total,
      items,
      userPk: message.userPk
    };
    try {
      await kinesis.send(
        new import_client_kinesis.PutRecordCommand({
          StreamName: streamName,
          PartitionKey: message.orderId,
          Data: Buffer.from(JSON.stringify(payload))
        })
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      console.error("order-lake: kinesis put failed", {
        orderId: message.orderId,
        reason
      });
      throw error instanceof Error ? error : new Error("Kinesis error");
    }
  }
  return { batchItemFailures };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createOrderHandler,
  listOrdersHandler,
  loginHandler,
  optionsHandler,
  orderEmailHandler,
  orderLakeHandler,
  orderStreamHandler,
  productsHandler,
  refreshHandler,
  registerHandler
});
