import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';

describe('AppRoutingModule', () => {
  it('configures router providers', () => {
    TestBed.configureTestingModule({
      imports: [AppRoutingModule],
    });
    expect(TestBed.inject(Router)).toBeTruthy();
  });
});
