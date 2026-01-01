import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../app.tokens';

/**
 * Line item payload sent to the orders API.
 */
export interface OrderItem {
  /**
   * Product identifier.
   */
  productId: string;
  /**
   * Quantity requested for the product.
   */
  quantity: number;
}

/**
 * Line item details returned in order summaries.
 */
export interface OrderSummaryItem {
  /**
   * Product identifier.
   */
  productId: string;
  /**
   * Quantity requested for the product.
   */
  quantity: number;
  /**
   * Unit price in cents for the item.
   */
  unitPrice: number;
}

/**
 * Summary fields used to render order history.
 */
export interface OrderSummary {
  /**
   * Order identifier.
   */
  orderId: string;
  /**
   * Status label of the order.
   */
  status: string;
  /**
   * ISO timestamp for when the order was created.
   */
  createdAt: string;
  /**
   * Line items included in the order.
   */
  items: OrderSummaryItem[];
  /**
   * Total order value in cents.
   */
  total: number;
  /**
   * Currency code for the order totals.
   */
  currency: string;
}

/**
 * Paginated orders response from the backend API.
 */
interface PaginatedOrdersResponse {
  /**
   * Page items returned by the API.
   */
  items: OrderSummary[];
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
 * Provides API access for creating and listing orders.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  /**
   * Http client for orders API requests.
   */
  private readonly http = inject(HttpClient);
  /**
   * Base URL for the orders API.
   */
  private readonly apiBase = inject(API_BASE_URL);

  /**
   * Sends a new order request for the current cart items.
   */
  createOrder(items: OrderItem[]) {
    return this.http.post<OrderSummary>(`${this.apiBase}/orders`, {
      items,
    });
  }

  /**
   * Fetches the authenticated user's order history.
   */
  listOrders() {
    return this.http
      .get<PaginatedOrdersResponse>(`${this.apiBase}/orders`)
      .pipe(map((response) => response.items ?? []));
  }
}
