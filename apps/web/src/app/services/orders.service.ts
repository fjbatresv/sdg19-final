import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../app.tokens';

/**
 * Line item payload sent to the orders API.
 */
export type OrderItem = {
  productId: string;
  quantity: number;
};

/**
 * Summary fields used to render order history.
 */
export type OrderSummary = {
  orderId: string;
  status: string;
  createdAt: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  total: number;
  currency: string;
};

/**
 * Paginated orders response from the backend API.
 */
type PaginatedOrdersResponse = {
  items: OrderSummary[];
  limit: number;
  nextToken?: string;
  returnedCount?: number;
};

/**
 * Provides API access for creating and listing orders.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
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
