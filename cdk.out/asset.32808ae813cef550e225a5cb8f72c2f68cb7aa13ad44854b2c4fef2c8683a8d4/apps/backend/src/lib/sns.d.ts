/**
 * Publish an order payload to SNS.
 *
 * Expected payload shape:
 * - orderId (string, required): order identifier.
 * - userPk (string, required): user partition key (e.g., USER#<sub>).
 * - createdAt (string, required): ISO-8601 timestamp.
 * - status (string, required): order status (e.g., CREATED).
 * - total (number, required): total amount for the order.
 * - email (string, optional): customer email used for notifications.
 * - items (array, optional): list of order items with:
 *   - productId (string, required)
 *   - productName (string, required)
 *   - quantity (number, required)
 *   - unitPrice (number, required)
 *
 * Example:
 * {
 *   "orderId": "order-123",
 *   "userPk": "USER#abc123",
 *   "createdAt": "2024-12-31T12:00:00.000Z",
 *   "status": "CREATED",
 *   "total": 99.5,
 *   "email": "user@example.com",
 *   "items": [
 *     { "productId": "p-1", "productName": "Camiseta", "quantity": 1, "unitPrice": 99.5 }
 *   ]
 * }
 */
export declare function publishOrder(topicArn: string, payload: unknown): Promise<void>;
//# sourceMappingURL=sns.d.ts.map