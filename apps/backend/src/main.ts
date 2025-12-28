import { registerHandler, loginHandler, refreshHandler } from './handlers/auth';
import { productsHandler } from './handlers/products';
import { createOrderHandler, listOrdersHandler } from './handlers/orders';
import { orderStreamHandler } from './handlers/order-stream';

export {
  registerHandler,
  loginHandler,
  refreshHandler,
  productsHandler,
  createOrderHandler,
  listOrdersHandler,
  orderStreamHandler,
};
