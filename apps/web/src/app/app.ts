import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  imports: [CommonModule, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
/**
 * Root shell for the storefront, exposes auth state and navigation actions.
 */
export class App {
  protected auth = inject(AuthService);
  private router = inject(Router);

  /**
   * Ends the current session and returns the user to the login screen.
   */
  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
