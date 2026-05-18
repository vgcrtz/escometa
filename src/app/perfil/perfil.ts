import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-perfil',
  imports: [CommonModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private authService = inject(Auth);
  private location = inject(Location);

  // Signals para el control de estado reactivo
  public userData = signal<any>(null);
  public isLoading = signal<boolean>(true);

  // URL Dummy para la foto de perfil (Se actualizará después)
  public dummyAvatar =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';

  // Alerta reactiva: Evalúa si el usuario es ADMINISTRADOR
  public isAdmin = computed(() => this.userData()?.tipo_usuario === 'ADMIN');

  ngOnInit(): void {
    this.authService.obtener_datos_usuario().subscribe({
      next: (respuesta) => {
        if (respuesta && respuesta.data) {
          this.userData.set(respuesta.data);
        } else {
          this.userData.set(respuesta);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al recuperar credenciales de me:', err);
        this.isLoading.set(false);
      },
    });
  }

  regresar(): void {
    this.location.back();
  }
}
