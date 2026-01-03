import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * Root shell for the storefront, exposes auth state and navigation actions.
 */
@Component({
  imports: [CommonModule, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  /**
   * Auth service used for session state in the shell.
   */
  protected auth = inject(AuthService);
  /**
   * Router used to redirect on logout.
   */
  private readonly router = inject(Router);

  /**
   * Ends the current session and returns the user to the login screen.
   */
  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
