import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersService, OrderSummary } from '../services/orders.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="orders-shell">
      <div class="orders-header">
        <div>
          <p class="eyebrow">Historial</p>
          <h1>Tus ordenes recientes</h1>
        </div>
        <a class="ghost" routerLink="/shop">Volver al catalogo</a>
      </div>

      <div class="orders-list">
        <article class="order-card" *ngFor="let order of orders()">
          <div>
            <p class="order-id">Orden {{ order.orderId }}</p>
            <p class="subtle">Creada {{ order.createdAt | date: 'medium' }}</p>
          </div>
          <div class="order-meta">
            <span class="pill">{{ order.status }}</span>
            <strong>{{ formatMoney(order.total) }}</strong>
          </div>
        </article>
      </div>

      <p class="subtle" *ngIf="loading()">Cargando ordenes...</p>
      <p class="error" *ngIf="error()">{{ error() }}</p>
    </section>
  `,
})
export class OrdersComponent {
  private ordersService = inject(OrdersService);

  orders = signal<OrderSummary[]>([]);
  loading = signal(true);
  error = signal('');

  constructor() {
    this.ordersService.listOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'No pudimos cargar las ordenes.');
        this.loading.set(false);
      },
    });
  }

  formatMoney(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }
}
