import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { variables_globales } from '../variables-globales';

interface ApiResponse<T> {
  status?: string;
  message?: string;
  data?: T;
}

interface RawNotification {
  id?: number;
  id_notificacion?: number;
  id_usuario?: number;
  titulo?: string;
  descripcion?: string;
  contenido?: string;
  fecha?: string;
  created_at?: string;
  tipo?: string;
  leida?: boolean;
}

interface NotificationView {
  id: number;
  id_usuario?: number;
  titulo: string;
  descripcion: string;
  contenido: string;
  fecha?: string;
  tiempo: string;
  leida: boolean;
  tipo: string;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.css',
})
export class Notificaciones implements OnInit {
  private location = inject(Location);
  private http = inject(HttpClient);
  private readonly apiUrl = variables_globales.server_url.replace(/\/$/, '');

  public currentIndex = signal<number>(0);
  public listadoNotificaciones = signal<NotificationView[]>([]);
  public selectedNotification = signal<NotificationView | null>(null);
  public isLoading = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);
  public errorMessage = signal<string>('');

  public currentNotification = computed(() => {
    const list = this.listadoNotificaciones();
    const index = this.currentIndex();
    return list.length > 0 ? list[Math.min(index, list.length - 1)] : null;
  });

  public unreadCount = computed(() =>
    this.listadoNotificaciones().filter((notification) => !notification.leida).length,
  );

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http
      .get<ApiResponse<RawNotification[]> | RawNotification[]>(`${this.apiUrl}/notificaciones`, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          const data = Array.isArray(response) ? response : response?.data || [];
          const normalized = data.map((notification) => this.normalizeNotification(notification));

          this.listadoNotificaciones.set(normalized);
          this.currentIndex.set(normalized.length > 0 ? 0 : 0);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.getErrorMessage(error));
          this.listadoNotificaciones.set([]);
          this.currentIndex.set(0);
          this.isLoading.set(false);
        },
      });
  }

  regresar(): void {
    this.location.back();
  }

  nextSlide(): void {
    const total = this.listadoNotificaciones().length;
    if (total === 0) return;
    this.currentIndex.update((index) => (index + 1) % total);
  }

  prevSlide(): void {
    const total = this.listadoNotificaciones().length;
    if (total === 0) return;
    this.currentIndex.update((index) => (index - 1 + total) % total);
  }

  goToSlide(index: number): void {
    if (index < 0 || index >= this.listadoNotificaciones().length) return;
    this.currentIndex.set(index);
  }

  openNotificationDetail(notification: NotificationView | null): void {
    if (!notification) return;

    this.selectedNotification.set(notification);
    this.marcarComoLeida(notification);
  }

  closeNotificationDetail(): void {
    this.selectedNotification.set(null);
  }

  marcarComoLeidaActual(): void {
    this.openNotificationDetail(this.currentNotification());
  }

  marcarComoLeida(notification: NotificationView): void {
    if (notification.leida || this.isUpdating()) return;

    this.updateLocalReadStatus(notification.id, true);
    this.isUpdating.set(true);

    this.http
      .put<ApiResponse<any>>(`${this.apiUrl}/notificaciones/${notification.id}/leer`, null, {
        withCredentials: true,
      })
      .subscribe({
        next: () => {
          this.isUpdating.set(false);
        },
        error: (error) => {
          this.updateLocalReadStatus(notification.id, false);
          this.errorMessage.set(this.getErrorMessage(error));
          this.isUpdating.set(false);
        },
      });
  }

  marcarTodasComoLeidas(): void {
    if (this.unreadCount() === 0 || this.isUpdating()) return;

    const previous = this.listadoNotificaciones();
    this.listadoNotificaciones.update((notifications) =>
      notifications.map((notification) => ({ ...notification, leida: true })),
    );
    this.isUpdating.set(true);
    this.errorMessage.set('');

    this.http
      .put<ApiResponse<any>>(`${this.apiUrl}/notificaciones/leer-todas`, null, {
        withCredentials: true,
      })
      .subscribe({
        next: () => {
          this.isUpdating.set(false);
        },
        error: (error) => {
          this.listadoNotificaciones.set(previous);
          this.errorMessage.set(this.getErrorMessage(error));
          this.isUpdating.set(false);
        },
      });
  }

  formatDate(value?: string): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private updateLocalReadStatus(id: number, leida: boolean): void {
    this.listadoNotificaciones.update((notifications) =>
      notifications.map((notification) =>
        notification.id === id ? { ...notification, leida } : notification,
      ),
    );

    this.selectedNotification.update((current) =>
      current?.id === id ? { ...current, leida } : current,
    );
  }

  private normalizeNotification(notification: RawNotification): NotificationView {
    const id = notification.id_notificacion ?? notification.id ?? 0;
    const contenido = (notification.contenido || notification.descripcion || notification.titulo || '').trim();
    const splitIndex = contenido.indexOf(':');
    const titleFromContent = splitIndex > 0 ? contenido.slice(0, splitIndex).trim() : '';
    const descriptionFromContent = splitIndex > 0 ? contenido.slice(splitIndex + 1).trim() : contenido;

    return {
      id,
      id_usuario: notification.id_usuario,
      titulo: notification.titulo || titleFromContent || 'Notificación',
      descripcion: notification.descripcion || descriptionFromContent || 'Sin descripción disponible.',
      contenido: contenido || notification.descripcion || notification.titulo || 'Sin contenido disponible.',
      fecha: notification.fecha || notification.created_at,
      tiempo: this.getRelativeTime(notification.fecha || notification.created_at),
      leida: Boolean(notification.leida),
      tipo: notification.tipo || this.getNotificationType(contenido),
    };
  }

  private getNotificationType(content: string): string {
    const normalized = content.toLowerCase();
    if (normalized.includes('anuncio') || normalized.includes('aviso')) return 'anuncio';
    if (normalized.includes('asistencia')) return 'asistencia';
    if (normalized.includes('mensaje') || normalized.includes('chat')) return 'mensaje';
    return 'sistema';
  }

  private getRelativeTime(value?: string): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) return 'Ahora';
    if (diffMs < hour) return `Hace ${Math.floor(diffMs / minute)} min`;
    if (diffMs < day) return `Hace ${Math.floor(diffMs / hour)} h`;
    if (diffMs < 2 * day) return 'Ayer';
    if (diffMs < 7 * day) return `Hace ${Math.floor(diffMs / day)} días`;

    return this.formatDate(value);
  }

  private getErrorMessage(error: any): string {
    const detail = error?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (detail?.message) return detail.message;
    if (error?.error?.message) return error.error.message;
    return 'No se pudieron cargar las notificaciones. Intenta nuevamente.';
  }
}
