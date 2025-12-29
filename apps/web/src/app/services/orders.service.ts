import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
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
    return this.http.get<OrderSummary[]>(`${this.apiBase}/orders`);
  }
}
