import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';
import { map } from 'rxjs';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.isLoggedIn()){
    router.navigate(['/inicio']);
    return false;
  }

  return authService.verificarSesion().pipe(
    map(respuesta => {
      if (respuesta){
        router.navigate(['/inicio']);
        return false;
      } else
        return true;
      }
    )
  )
};
