import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { OrdersService } from './orders.service';
import { API_BASE_URL } from '../app.tokens';
import { firstValueFrom } from 'rxjs';

describe('OrdersService', () => {
  let httpMock: HttpTestingController;
  let service: OrdersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OrdersService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates an order', async () => {
    const promise = firstValueFrom(
      service.createOrder([{ productId: 'prod-1', quantity: 2 }])
    );

    const request = httpMock.expectOne('http://api.test/orders');
    request.flush({
      orderId: 'order-1',
      status: 'CREATED',
      createdAt: '2024-01-01T00:00:00.000Z',
      items: [],
      total: 2000,
      currency: 'USD',
    });

    const order = await promise;
    expect(order.orderId).toBe('order-1');
  });

  it('lists orders and maps items', async () => {
    const promise = firstValueFrom(service.listOrders());

    const request = httpMock.expectOne('http://api.test/orders');
    request.flush({
      items: [
        {
          orderId: 'order-2',
          status: 'CREATED',
          createdAt: '2024-01-01T00:00:00.000Z',
          items: [],
          total: 1000,
          currency: 'USD',
        },
      ],
      limit: 20,
    });

    const orders = await promise;
    expect(orders).toHaveLength(1);
    expect(orders[0].orderId).toBe('order-2');
  });

  it('returns empty list when response has no items', async () => {
    const promise = firstValueFrom(service.listOrders());

    const request = httpMock.expectOne('http://api.test/orders');
    request.flush({
      limit: 20,
    });

    const orders = await promise;
    expect(orders).toHaveLength(0);
  });
});
