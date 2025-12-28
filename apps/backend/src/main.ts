import { registerHandler, loginHandler } from './handlers/auth';
import { productsHandler } from './handlers/products';
import { createOrderHandler, listOrdersHandler } from './handlers/orders';
import { orderStreamHandler } from './handlers/order-stream';

export {
  registerHandler,
  loginHandler,
  productsHandler,
  createOrderHandler,
  listOrdersHandler,
  orderStreamHandler,
};
