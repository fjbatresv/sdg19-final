import { Route } from '@angular/router';
import { authGuard } from './auth.guard';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { ShopComponent } from './pages/shop.component';
import { OrdersComponent } from './pages/orders.component';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'shop',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'shop',
    component: ShopComponent,
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    component: OrdersComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'shop',
  },
];
