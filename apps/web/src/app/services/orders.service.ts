import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../app.tokens';

export type OrderItem = {
  productId: string;
  quantity: number;
};

export type OrderSummary = {
  orderId: string;
  status: string;
  createdAt: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  total: number;
  currency: string;
};

type PaginatedOrdersResponse = {
  items: OrderSummary[];
  limit: number;
  nextToken?: string;
  returnedCount?: number;
};

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE_URL);

  createOrder(items: OrderItem[]) {
    return this.http.post<OrderSummary>(`${this.apiBase}/orders`, {
      items,
    });
  }

  listOrders() {
    return this.http
      .get<PaginatedOrdersResponse>(`${this.apiBase}/orders`)
      .pipe(map((response) => response.items ?? []));
  }
}
