import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  // TEMPORARILY DISABLED FOR DEVELOPMENT - always allow access
  return true;
  
  // Original auth check (uncomment when ready):
  // const authService = inject(AuthService);
  // const router = inject(Router);
  // if (authService.isAuthenticated()) {
  //   return true;
  // }
  // router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  // return false;
};

export const permissionGuard = (requiredPermissions: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    if (authService.hasAnyPermission(requiredPermissions)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
};
