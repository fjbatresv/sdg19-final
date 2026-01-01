import type { Product } from '@org/shared-types';

export type { Product } from '@org/shared-types';

export const products: Product[] = [
  {
    id: 'prod-001',
    name: 'Starter Pack',
    description: 'Paquete inicial',
    price: 2999,
    currency: 'USD',
    availableQuantity: 25,
  },
  {
    id: 'prod-002',
    name: 'Pro Pack',
    description: 'Paquete profesional',
    price: 5999,
    currency: 'USD',
    availableQuantity: 12,
  },
  {
    id: 'prod-003',
    name: 'Enterprise Pack',
    description: 'Paquete empresarial',
    price: 12999,
    currency: 'USD',
    availableQuantity: 4,
  },
];
