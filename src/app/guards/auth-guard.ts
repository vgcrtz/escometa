import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.isLoggedIn()) return true;

  return authService.verificarSesion().pipe(
    map((respuesta) => {
      if (respuesta?.authenticated === true) return true;
      router.navigate(['/iniciar-sesion']);
      return false;
    }),
  );
};
