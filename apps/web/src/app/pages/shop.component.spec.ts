import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { OrdersService } from '../services/orders.service';
import { ProductsService } from '../services/products.service';
import { ShopComponent } from './shop.component';
import type { Product } from '@org/shared-types';

describe('ShopComponent', () => {
  const products: Product[] = [
    {
      id: 'prod-1',
      name: 'Item 1',
      description: 'Desc',
      price: 1000,
      currency: 'EUR',
      availableQuantity: 3,
    },
    {
      id: 'prod-2',
      name: 'Item 2',
      description: 'Desc',
      price: 2000,
      currency: 'USD',
      availableQuantity: 3,
    },
  ];

  const setup = (overrides?: {
    productsService?: Partial<ProductsService>;
    ordersService?: Partial<OrdersService>;
  }) => {
    const productsService = {
      getProducts: vi.fn(() => of(products)),
      ...overrides?.productsService,
    };
    const ordersService = {
      createOrder: vi.fn(() => of({ orderId: 'order-1' })),
      ...overrides?.ordersService,
    };

    TestBed.configureTestingModule({
      imports: [ShopComponent],
      providers: [
        { provide: ProductsService, useValue: productsService },
        { provide: OrdersService, useValue: ordersService },
        provideRouter([]),
      ],
    });

    const fixture = TestBed.createComponent(ShopComponent);
    const component = fixture.componentInstance;
    return { component, productsService, ordersService };
  };

  it('loads products on init', () => {
    const { component } = setup();
    expect(component.loading()).toBe(false);
    expect(component.products().length).toBe(2);
  });

  it('sets an error when catalog fails to load', () => {
    const { component } = setup({
      productsService: {
        getProducts: vi.fn(() => throwError(() => new Error('fail'))),
      },
    });
    expect(component.error()).toBe('No pudimos cargar el catalogo.');
  });

  it('blocks mixed currency items', () => {
    const { component } = setup();
    component.addToCart(products[0]);
    component.addToCart(products[1]);
    expect(component.cartCurrencyError()).toBe(
      'No puedes mezclar monedas en el carrito.'
    );
  });

  it('blocks mixed currency when first item is USD', () => {
    const { component } = setup();
    component.addToCart(products[1]);
    component.addToCart(products[0]);
    expect(component.cartCurrencyError()).toBe(
      'No puedes mezclar monedas en el carrito.'
    );
  });

  it('returns MIXED when cart has multiple currencies', () => {
    const { component } = setup();
    component.cart.set([
      { product: products[0], quantity: 1 },
      { product: products[1], quantity: 1 },
    ]);
    expect(component.cartCurrency()).toBe('MIXED');
    expect(component.cartTotal()).toBe(0);
  });

  it('adjusts cart quantities', () => {
    const { component } = setup();
    component.addToCart(products[0]);
    component.addToCart(products[0]);
    expect(component.cart()[0].quantity).toBe(2);
    component.adjustQty(products[0].id, -1);
    expect(component.cart()[0].quantity).toBe(1);
    component.adjustQty(products[0].id, -1);
    expect(component.cart().length).toBe(0);
  });

  it('defaults cart currency to USD when empty', () => {
    const { component } = setup();
    expect(component.cartCurrency()).toBe('USD');
  });

  it('ignores quantity changes for missing items', () => {
    const { component } = setup();
    component.adjustQty('missing', -1);
    expect(component.cart().length).toBe(0);
  });

  it('does not submit empty cart', () => {
    const { component, ordersService } = setup();
    component.placeOrder();
    expect(ordersService.createOrder).not.toHaveBeenCalled();
  });

  it('submits orders and clears cart', () => {
    const { component, ordersService } = setup();
    component.addToCart(products[0]);
    component.placeOrder();
    expect(ordersService.createOrder).toHaveBeenCalled();
    expect(component.cart().length).toBe(0);
    expect(component.noticeMessage()).toContain('Orden');
    expect(component.formatMoney(1000, 'USD')).toContain('$');
  });

  it('surfaces errors when order fails', () => {
    const { component } = setup({
      ordersService: {
        createOrder: vi.fn(() =>
          throwError(() => ({ error: { message: 'fail' } }))
        ),
      },
    });
    component.addToCart(products[0]);
    component.placeOrder();
    expect(component.orderErrorMessage()).toBe('fail');
  });
});
