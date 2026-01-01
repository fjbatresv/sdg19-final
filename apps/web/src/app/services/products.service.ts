import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { API_BASE_URL } from '../app.tokens';

/**
 * Product entry displayed in the catalog.
 */
export type Product = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  currency: string;
  availableQuantity: number;
  inStock: boolean;
};

/**
 * Paginated products response from the backend API.
 */
type ProductsResponse = {
  items: Product[];
  limit: number;
  nextToken?: string;
  returnedCount?: number;
};

/**
 * Local fallback catalog used when the API is unavailable.
 */
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Starter Pack',
    description: 'Paquete inicial',
    price: 2999,
    currency: 'USD',
    availableQuantity: 25,
    inStock: true,
  },
  {
    id: 'prod-002',
    name: 'Pro Pack',
    description: 'Paquete profesional',
    price: 5999,
    currency: 'USD',
    availableQuantity: 12,
    inStock: true,
  },
  {
    id: 'prod-003',
    name: 'Enterprise Pack',
    description: 'Paquete empresarial',
    price: 12999,
    currency: 'USD',
    availableQuantity: 4,
    inStock: true,
  },
];

/**
 * Provides access to the product catalog API.
 */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE_URL);

  /**
   * Fetches the catalog of available products.
   */
  getProducts() {
    return this.http
      .get<ProductsResponse>(`${this.apiBase}/products`)
      .pipe(
        map((response) => response.items ?? []),
        catchError(() => of(FALLBACK_PRODUCTS))
      );
  }
}
