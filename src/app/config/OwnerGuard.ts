import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/AuthService';

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isOwner()) return true;
  inject(Router).navigate([auth.getToken() ? '/' : '/login']);
  return false;
};
