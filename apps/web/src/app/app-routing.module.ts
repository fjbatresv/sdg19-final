import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { appRoutes } from './app.routes';

/**
 * Routing module used by Compodoc to render the route tree.
 */
@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
