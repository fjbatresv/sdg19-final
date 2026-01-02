import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { OrdersService } from '../services/orders.service';
import { OrdersComponent } from './orders.component';

describe('OrdersComponent', () => {
  it('loads orders on init', () => {
    const ordersService = {
      listOrders: vi.fn(() =>
        of([
          {
            orderId: 'order-1',
            status: 'CREATED',
            createdAt: '2024-01-01T00:00:00.000Z',
            items: [],
            total: 1000,
            currency: 'USD',
          },
        ])
      ),
    };

    TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        provideRouter([]),
      ],
    });

    const fixture = TestBed.createComponent(OrdersComponent);
    const component = fixture.componentInstance;
    expect(component.loading()).toBe(false);
    expect(component.orders().length).toBe(1);
    expect(component.formatMoney(1000, 'USD')).toContain('$');
  });

  it('sets an error when loading fails', () => {
    const ordersService = {
      listOrders: vi.fn(() => throwError(() => ({ error: { message: 'bad' } }))),
    };

    TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        provideRouter([]),
      ],
    });

    const fixture = TestBed.createComponent(OrdersComponent);
    const component = fixture.componentInstance;
    expect(component.error()).toBe('bad');
  });

  it('uses default error message when missing', () => {
    const ordersService = {
      listOrders: vi.fn(() => throwError(() => ({}))),
    };

    TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        provideRouter([]),
      ],
    });

    const fixture = TestBed.createComponent(OrdersComponent);
    const component = fixture.componentInstance;
    expect(component.error()).toBe('No pudimos cargar las ordenes.');
  });
});
