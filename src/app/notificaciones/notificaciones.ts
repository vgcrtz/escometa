import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.css',
})
export class Notificaciones {
  private location = inject(Location);

  // Índice de la notificación activa en el carrusel
  public currentIndex = signal<number>(0);

  // Listado de notificaciones (Mock data preservada)
  public listadoNotificaciones = signal([
    {
      id: 1,
      titulo: 'Nuevo mensaje en el foro',
      descripcion:
        'El profesor de Redes Neuronales ha respondido a tu duda sobre el Backpropagation.',
      tiempo: 'Hace 10 min',
      leida: false,
      tipo: 'mensaje',
    },
    {
      id: 2,
      titulo: 'Código de verificación enviado',
      descripcion: 'Se solicitó un reenvío del código de acceso para el correo institucional.',
      tiempo: 'Hace 2 horas',
      leida: false,
      tipo: 'seguridad',
    },
    {
      id: 3,
      titulo: 'Cambio de horario asignado',
      descripcion:
        'La sección de gestión escolar actualizó los laboratorios de Inteligencia Artificial.',
      tiempo: 'Ayer',
      leida: true,
      tipo: 'sistema',
    },
  ]);

  // Señal computada para obtener la notificación que se debe mostrar actualmente
  public currentNotification = computed(() => {
    const list = this.listadoNotificaciones();
    const index = this.currentIndex();
    return list.length > 0 ? list[index] : null;
  });

  regresar(): void {
    this.location.back();
  }

  nextSlide(): void {
    if (this.currentIndex() < this.listadoNotificaciones().length - 1) {
      this.currentIndex.update((idx) => idx + 1);
    } else {
      this.currentIndex.set(0); // Reinicia al inicio (bucle infinito)
    }
  }

  prevSlide(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((idx) => idx - 1);
    } else {
      this.currentIndex.set(this.listadoNotificaciones().length - 1); // Va al final
    }
  }

  goToSlide(index: number): void {
    this.currentIndex.set(index);
  }

  marcarComoLeidaActual(): void {
    const current = this.currentNotification();
    if (current && !current.leida) {
      this.listadoNotificaciones.update((notificaciones) =>
        notificaciones.map((n) => (n.id === current.id ? { ...n, leida: true } : n)),
      );
    }
  }
}
