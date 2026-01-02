import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProductsService } from './products.service';
import { API_BASE_URL } from '../app.tokens';
import { firstValueFrom } from 'rxjs';

describe('ProductsService', () => {
  let httpMock: HttpTestingController;
  let service: ProductsService;

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
    service = TestBed.inject(ProductsService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns products from the API', async () => {
    const promise = firstValueFrom(service.getProducts());

    const request = httpMock.expectOne('http://api.test/products');
    request.flush({
      items: [
        {
          id: 'prod-1',
          name: 'Item',
          description: 'Desc',
          price: 1000,
          currency: 'USD',
          availableQuantity: 5,
        },
      ],
    });

    const items = await promise;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('prod-1');
  });

  it('falls back to local products on error', async () => {
    const promise = firstValueFrom(service.getProducts());

    const request = httpMock.expectOne('http://api.test/products');
    request.flush({ message: 'fail' }, { status: 500, statusText: 'Error' });

    const items = await promise;
    expect(items.length).toBeGreaterThan(0);
    const first = items[0];
    expect(first.id).toBeTruthy();
    expect(typeof first.name).toBe('string');
    expect(first.name.length).toBeGreaterThan(0);
    expect(typeof first.price).toBe('number');
    expect(first.price).toBeGreaterThanOrEqual(0);
  });

  it('returns empty list when items are missing', async () => {
    const promise = firstValueFrom(service.getProducts());

    const request = httpMock.expectOne('http://api.test/products');
    request.flush({});

    const items = await promise;
    expect(items).toHaveLength(0);
  });
});
