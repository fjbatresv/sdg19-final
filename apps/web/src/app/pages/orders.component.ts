import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersService, OrderSummary } from '../services/orders.service';

/**
 * Displays the authenticated user's recent orders.
 */
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
        @for (order of orders(); track order.orderId) {
        <article class="order-card">
          <div>
            <p class="order-id">Orden {{ order.orderId }}</p>
            <p class="subtle">Creada {{ order.createdAt | date : 'medium' }}</p>
          </div>
          <div class="order-meta">
            <span class="pill">{{ order.status }}</span>
            <strong>{{ formatMoney(order.total, order.currency) }}</strong>
          </div>
        </article>
        }
      </div>

      @if (loading()) {
      <p class="subtle">Cargando ordenes...</p>
      } @if (error()) {
      <p class="error">{{ error() }}</p>
      }
    </section>
  `,
})
export class OrdersComponent {
  /**
   * Service used to load orders for the current user.
   */
  private readonly ordersService = inject(OrdersService);

  /**
   * Orders returned for the current user.
   */
  orders = signal<OrderSummary[]>([]);
  /**
   * Loading flag while fetching order history.
   */
  loading = signal(true);
  /**
   * Error message when loading fails.
   */
  error = signal('');

  /**
   * Loads order history on component creation.
   */
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

  /**
   * Formats cents into a localized currency string.
   */
  formatMoney(value: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value / 100);
  }
}
