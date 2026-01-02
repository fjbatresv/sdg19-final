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
  templateUrl: './orders.component.html',
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
