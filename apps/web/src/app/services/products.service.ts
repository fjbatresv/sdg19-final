import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { API_BASE_URL } from '../app.tokens';

/**
 * Product entry displayed in the catalog.
 */
export interface Product {
  /**
   * Product identifier.
   */
  id: string;
  /**
   * Display name for the catalog.
   */
  name: string;
  /**
   * Optional description shown in the UI.
   */
  description?: string;
  /**
   * Optional image URL for the product.
   */
  imageUrl?: string;
  /**
   * Price in cents.
   */
  price: number;
  /**
   * Currency code for the price.
   */
  currency: string;
  /**
   * Quantity available for purchase.
   */
  availableQuantity: number;
  /**
   * Whether the product is currently in stock.
   */
  inStock: boolean;
}

/**
 * Paginated products response from the backend API.
 */
interface ProductsResponse {
  /**
   * Page items returned by the API.
   */
  items: Product[];
  /**
   * Page size limit used by the API.
   */
  limit: number;
  /**
   * Pagination cursor for the next page.
   */
  nextToken?: string;
  /**
   * Count of items returned in this page.
   */
  returnedCount?: number;
}

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
  /**
   * Http client for catalog requests.
   */
  private readonly http = inject(HttpClient);
  /**
   * Base URL for the products API.
   */
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
