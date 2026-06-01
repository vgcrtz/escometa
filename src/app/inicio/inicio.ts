import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  private authService = inject(Auth);
  private router = inject(Router);

  // Vinculamos las señales globales de autenticación
  public isLoggedIn = this.authService.isLoggedIn;
  public userRol = this.authService.userRol;

  // Señal computada para renderizar dinámicamente el texto del saludo principal
  public userRolTexto = computed(() => {
    if (!this.isLoggedIn()) {
      return 'INVITADO';
    }
    const rol = this.userRol();
    if (rol === 'DOCENTE' || rol === 'PROFESOR') return 'PROFESOR';
    if (rol === 'ADMIN' || rol === 'ADMINISTRATIVO') return 'ADMINISTRADOR';
    if (rol === 'ALUMNO') return 'ALUMNO';
    return 'INVITADO';
  });

  // Lista Maestra completa con todos los módulos y sus permisos asociados
  private todasLasOpciones = [
    {
      titulo: 'Horario',
      icono: 'calendar.png',
      colorClase: 'bg-dark-blue',
      link: '/horario',
      rolesPermitidos: ['ALUMNO', 'DOCENTE', 'ADMIN', 'ADMINISTRATIVO'],
    },
    {
      titulo: 'Asistente',
      icono: 'chat.png',
      colorClase: 'bg-medium-blue',
      link: '/chatbot',
      rolesPermitidos: ['INVITADO', 'ALUMNO', 'DOCENTE', 'ADMIN', 'ADMINISTRATIVO'],
    },
    {
      titulo: 'Investigar',
      icono: 'loupe.png',
      colorClase: 'bg-medium-blue',
      link: '/busqueda',
      rolesPermitidos: ['ALUMNO', 'DOCENTE', 'ADMIN', 'ADMINISTRATIVO'],
    },
    {
      titulo: 'Foro',
      icono: 'people.png',
      colorClase: 'bg-light-blue',
      link: '/foro',
      rolesPermitidos: ['INVITADO', 'ALUMNO', 'DOCENTE', 'ADMIN', 'ADMINISTRATIVO'], // Visible para todos, incluyendo invitados
    },
    {
      titulo: 'Mensajes',
      icono: 'chat.png',
      colorClase: 'bg-very-light-blue',
      link: '/mensajeria',
      rolesPermitidos: ['ALUMNO', 'DOCENTE', 'ADMIN', 'ADMINISTRATIVO'],
    },
    {
      titulo: 'Asistencia',
      icono: 'check.png',
      colorClase: 'bg-asistencia-blue',
      link: '/asistencia',
      rolesPermitidos: ['DOCENTE'], // Módulo exclusivo para Profesores
    },
  ];

  public opcionesFiltradas = computed(() => {
    if (!this.isLoggedIn()) {
      return this.todasLasOpciones.filter((opc) => opc.link === '/foro');
    }

    console.log("Rol actual:", this.userRol());

    const rolActual = this.userRol() || 'INVITADO';

    return this.todasLasOpciones.filter((opcion) => opcion.rolesPermitidos.includes(rolActual));
  });

  // Manejador del clic para activar la redirección de Angular
  navegar(link: string): void {
    this.router.navigate([link]);
  }
}
