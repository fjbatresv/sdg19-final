import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from '../app.tokens';

export type Product = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  currency: string;
};

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Starter Pack',
    description: 'Paquete inicial',
    price: 29.99,
    currency: 'USD',
  },
  {
    id: 'prod-002',
    name: 'Pro Pack',
    description: 'Paquete profesional',
    price: 59.99,
    currency: 'USD',
  },
  {
    id: 'prod-003',
    name: 'Enterprise Pack',
    description: 'Paquete empresarial',
    price: 129.99,
    currency: 'USD',
  },
];

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private apiBase = inject(API_BASE_URL);

  getProducts() {
    return this.http
      .get<Product[]>(`${this.apiBase}/products`)
      .pipe(catchError(() => of(FALLBACK_PRODUCTS)));
  }
}
