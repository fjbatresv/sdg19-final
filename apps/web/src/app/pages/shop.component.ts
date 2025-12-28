import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../services/orders.service';
import { Product, ProductsService } from '../services/products.service';

type CartItem = {
  product: Product;
  quantity: number;
};

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
                  <span class="price">{{ formatMoney(product.price) }}</span>
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
                    {{ formatMoney(item.product.price) }} c/u
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
            <p class="total">{{ formatMoney(cartTotal()) }}</p>
          </div>
          <button
            class="primary"
            [disabled]="cart().length === 0 || ordering()"
            (click)="placeOrder()"
          >
            {{ ordering() ? 'Enviando...' : 'Crear orden' }}
          </button>
          @if (noticeMessage) {
            <p class="success">{{ noticeMessage }}</p>
          }
          @if (orderErrorMessage) {
            <p class="error">{{ orderErrorMessage }}</p>
          }
        </div>
      </aside>
    </section>
  `,
})
export class ShopComponent {
  private productsService = inject(ProductsService);
  private ordersService = inject(OrdersService);

  products = signal<Product[]>([]);
  cart = signal<CartItem[]>([]);
  loading = signal(true);
  error = signal('');
  ordering = signal(false);
  noticeMessage = '';
  orderErrorMessage = '';

  cartCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0)
  );
  cartTotal = computed(() =>
    this.cart().reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )
  );

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

  addToCart(product: Product) {
    const items = [...this.cart()];
    const existing = items.find((item) => item.product.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ product, quantity: 1 });
    }
    this.cart.set(items);
  }

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

  placeOrder() {
    if (!this.cart().length) {
      return;
    }
    this.ordering.set(true);
    this.noticeMessage = '';
    this.orderErrorMessage = '';
    const items = this.cart().map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));
    this.ordersService.createOrder(items).subscribe({
      next: (order) => {
        this.ordering.set(false);
        this.cart.set([]);
        this.noticeMessage = `Orden ${order.orderId} creada.`;
      },
      error: (err) => {
        this.ordering.set(false);
        this.orderErrorMessage =
          err?.error?.message ?? 'No pudimos crear la orden.';
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
