import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../services/orders.service';
import { ProductsService } from '../services/products.service';
import type { Product } from '@org/shared-types';

/**
 * Shopping cart line item.
 */
interface CartItem {
  /**
   * Product data from the catalog.
   */
  product: Product;
  /**
   * Quantity for this cart line.
   */
  quantity: number;
}

/**
 * Catalog and cart experience for creating orders.
 */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="shop-shell">
      <div class="shop-main">
        <div class="shop-header">
          <div>
            <p class="eyebrow">Catalogo SDG19</p>
            <h1>Productos listos para ordenar</h1>
          </div>
          <a class="ghost" routerLink="/orders">Ver ordenes</a>
        </div>

        @if (!loading()) {
          <div class="grid">
            @for (product of products(); track product.id) {
              <article class="product-card">
                <div class="product-body">
                  <h3>{{ product.name }}</h3>
                  <p class="subtle">{{ product.description }}</p>
                </div>
                <div class="product-footer">
                  <span class="price">
                    {{ formatMoney(product.price, product.currency) }}
                  </span>
                  <button class="primary" (click)="addToCart(product)">
                    Agregar
                  </button>
                </div>
              </article>
            }
          </div>
        }

        @if (loading()) {
          <p class="subtle">Cargando productos...</p>
        }
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
      </div>

      <aside class="cart">
        <div class="cart-header">
          <h2>Carrito</h2>
          <span class="pill">{{ cartCount() }} items</span>
        </div>
        @if (cart().length) {
          <div class="cart-list">
            @for (item of cart(); track item.product.id) {
              <div class="cart-item">
                <div>
                  <p class="cart-title">{{ item.product.name }}</p>
                  <p class="subtle">
                    {{ formatMoney(item.product.price, item.product.currency) }}
                    c/u
                  </p>
                </div>
                <div class="qty">
                  <button class="ghost" (click)="adjustQty(item.product.id, -1)">
                    -
                  </button>
                  <span>{{ item.quantity }}</span>
                  <button class="ghost" (click)="adjustQty(item.product.id, 1)">
                    +
                  </button>
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="subtle">Aun no hay items en el carrito.</p>
        }
        <div class="cart-summary">
          <div>
            <p class="subtle">Total</p>
            <p class="total">
              {{ formatMoney(cartTotal(), cartCurrency()) }}
            </p>
          </div>
          @if (cartCurrencyError()) {
            <p class="error">{{ cartCurrencyError() }}</p>
          }
          <button
            class="primary"
            [disabled]="cart().length === 0 || ordering()"
            (click)="placeOrder()"
          >
            {{ ordering() ? 'Enviando...' : 'Crear orden' }}
          </button>
          @if (noticeMessage()) {
            <p class="success">{{ noticeMessage() }}</p>
          }
          @if (orderErrorMessage()) {
            <p class="error">{{ orderErrorMessage() }}</p>
          }
        </div>
      </aside>
    </section>
  `,
})
export class ShopComponent {
  /**
   * Service for loading product catalog data.
   */
  private readonly productsService = inject(ProductsService);
  /**
   * Service for submitting orders.
   */
  private readonly ordersService = inject(OrdersService);

  /**
   * Catalog of products loaded from the API.
   */
  products = signal<Product[]>([]);
  /**
   * Cart state for the current session.
   */
  cart = signal<CartItem[]>([]);
  /**
   * Loading flag for the catalog request.
   */
  loading = signal(true);
  /**
   * Error message when catalog load fails.
   */
  error = signal('');
  /**
   * Flag while submitting an order.
   */
  ordering = signal(false);
  /**
   * Success message when an order is created.
   */
  noticeMessage = signal('');
  /**
   * Error message when order creation fails.
   */
  orderErrorMessage = signal('');
  /**
   * Error message when currencies are mixed in the cart.
   */
  cartCurrencyError = signal('');

  /**
   * Total number of items in the cart.
   */
  cartCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0)
  );
  /**
   * Total cost (in cents) of the cart for a single currency.
   */
  cartTotal = computed(() =>
    this.cartCurrency() === 'MIXED'
      ? 0
      : this.cart().reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        )
  );
  /**
   * Canonical cart currency, or MIXED if multiple currencies are present.
   */
  cartCurrency = computed(() => {
    const currencies = new Set(
      this.cart().map((item) => item.product.currency)
    );
    if (currencies.size === 0) {
      return 'USD';
    }
    if (currencies.size > 1) {
      return 'MIXED';
    }
    return currencies.values().next().value ?? 'USD';
  });

  /**
   * Loads product catalog data when the component is constructed.
   */
  constructor() {
    this.productsService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar el catalogo.');
        this.loading.set(false);
      },
    });
  }

  /**
   * Adds a product to the cart while enforcing a single currency.
   */
  addToCart(product: Product) {
    const items = [...this.cart()];
    const currentCurrency = this.cartCurrency();
    if (currentCurrency !== 'USD' && currentCurrency !== product.currency) {
      this.cartCurrencyError.set('No puedes mezclar monedas en el carrito.');
      return;
    }
    if (currentCurrency === 'USD' && items.length > 0) {
      const existingCurrency = items[0]?.product.currency ?? 'USD';
      if (existingCurrency !== product.currency) {
        this.cartCurrencyError.set('No puedes mezclar monedas en el carrito.');
        return;
      }
    }
    this.cartCurrencyError.set('');
    const existing = items.find((item) => item.product.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ product, quantity: 1 });
    }
    this.cart.set(items);
  }

  /**
   * Updates the quantity of a cart item.
   */
  adjustQty(productId: string, delta: number) {
    const items = [...this.cart()];
    const item = items.find((entry) => entry.product.id === productId);
    if (!item) {
      return;
    }
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart.set(items.filter((entry) => entry.product.id !== productId));
      return;
    }
    this.cart.set(items);
  }

  /**
   * Submits the cart as a new order.
   */
  placeOrder() {
    if (!this.cart().length) {
      return;
    }
    this.ordering.set(true);
    this.noticeMessage.set('');
    this.orderErrorMessage.set('');
    const items = this.cart().map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));
    this.ordersService.createOrder(items).subscribe({
      next: (order) => {
        this.ordering.set(false);
        this.cart.set([]);
        this.noticeMessage.set(`Orden ${order.orderId} creada.`);
      },
      error: (err) => {
        this.ordering.set(false);
        this.orderErrorMessage.set(
          err?.error?.message ?? 'No pudimos crear la orden.'
        );
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
