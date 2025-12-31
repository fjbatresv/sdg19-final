export interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  currency: string;
  availableQuantity: number;
  inStock: boolean;
}

export const products: Product[] = [
  {
    id: 'prod-001',
    name: 'Starter Pack',
    description: 'Paquete inicial',
    price: 29.99,
    currency: 'USD',
    availableQuantity: 25,
    inStock: true,
  },
  {
    id: 'prod-002',
    name: 'Pro Pack',
    description: 'Paquete profesional',
    price: 59.99,
    currency: 'USD',
    availableQuantity: 12,
    inStock: true,
  },
  {
    id: 'prod-003',
    name: 'Enterprise Pack',
    description: 'Paquete empresarial',
    price: 129.99,
    currency: 'USD',
    availableQuantity: 4,
    inStock: true,
  },
];
