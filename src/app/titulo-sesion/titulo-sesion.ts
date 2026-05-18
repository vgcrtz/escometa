import { Component, inject, OnInit, signal } from '@angular/core';
import { Auth } from '../services/auth';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-titulo-sesion',
  standalone: true,
  imports: [],
  templateUrl: './titulo-sesion.html',
  styleUrl: './titulo-sesion.css',
})
export class TituloSesion implements OnInit {
  private router = inject(Router);
  private authService = inject(Auth);

  // Signals para el estado reactivo
  public currentTitle = signal<string>('ESCOMETA');
  public isMenuOpen = signal<boolean>(false);
  public isLoggedIn = this.authService.isLoggedIn;

  // Diccionario de rutas y sus respectivos títulos
  private routeTitles: Record<string, string> = {
    '/inicio': 'ESCOMETA',
    '/mensajeria': 'CONVERSACIONES',
    '/foro': 'FORO',
    '/horario': 'HORARIO',
    '/asistencia': 'ASISTENCIA',
    '/busqueda': 'BÚSQUEDA',
    '/perfil': 'PERFIL',
    '/notificaciones': 'NOTIFICACIONES',
  };

  ngOnInit(): void {
    // Detectar el cambio de ruta automáticamente
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateTitle(event.urlAfterRedirects || event.url);
      });

    // Establecer el título inicial al cargar la página
    this.updateTitle(this.router.url);
  }

  private updateTitle(url: string): void {
    // Elimina parámetros (?query=...) o fragmentos (#hash) de la URL para el mapeo limpio
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.currentTitle.set(this.routeTitles[cleanUrl] || 'ESCOMETA');
  }

  toggleMenu(): void {
    this.isMenuOpen.update((prev) => !prev);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  onLogout(): void {
    this.closeMenu();
    console.log('Cerrando sesión...');

    this.authService.cerrar_sesion().subscribe({
      next: (respuesta) => {
        // 1. Limpiamos las Signals reactivas para actualizar las barras inmediatamente
        this.authService.isLoggedIn.set(false);
        this.authService.userRol.set('');

        // 2. Redirigimos de forma segura
        this.router.navigate(['/iniciar-sesion']);
      },
      error: (err) => {
        console.error('El servidor falló o la sesión ya no existía:', err);

        // 3. ¡Cierre forzado! Si el back falla, limpiamos el front de todos modos
        // para que el usuario no se quede atrapado en la app.
        this.authService.isLoggedIn.set(false);
        this.authService.userRol.set('');
        this.router.navigate(['/iniciar-sesion']);
      },
    });
  }

  navigateTo(path: string): void {
    this.closeMenu();
    this.router.navigate([path]);
  }
}
