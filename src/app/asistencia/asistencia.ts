import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asistencia.html',
  styleUrl: './asistencia.css',
})
export class Asistencia implements OnInit {
  private authService = inject(Auth);

  // Nombres de los meses oficiales
  meses: string[] = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ];

  // Fecha actual persistente para comparaciones de "Hoy"
  fechaHoyReal = new Date();

  // Variables de control de navegación del calendario
  mesSeleccionado = this.fechaHoyReal.getMonth();
  anioSeleccionado = this.fechaHoyReal.getFullYear();
  nombreMes = this.meses[this.mesSeleccionado];
  calendario: number[][] = [];

  // Signals reactivos para asistencias y mensajes de error
  public asistencias = signal<any[]>([]);
  public toastMessage = signal<string | null>(null);

  // Signal computada: Bloquea el botón si el día de hoy ya está registrado en el historial
  public yaChecoHoy = computed(() => {
    const anio = this.fechaHoyReal.getFullYear();
    const mes = String(this.fechaHoyReal.getMonth() + 1).padStart(2, '0');
    const dia = String(this.fechaHoyReal.getDate()).padStart(2, '0');
    const fechaHoyStr = `${anio}-${mes}-${dia}`;

    return this.asistencias().some((asist) => asist.fecha === fechaHoyStr);
  });

  ngOnInit() {
    this.cargarHistorialAsistencias();
    this.generarCalendario();
  }

  // Descarga el historial completo de asistencias del usuario logueado
  cargarHistorialAsistencias(): void {
    this.authService.obtener_mis_asistencias().subscribe({
      next: (respuesta) => {
        console.log('Historial de asistencias:', respuesta);
        if (respuesta && respuesta.status === 'success') {
          this.asistencias.set(respuesta.data);
        }
      },
      error: (err) => {
        console.error('Error al descargar historial de asistencias:', err);
      },
    });
  }

  // Registra la asistencia del día actual con las coordenadas fijas de la ESCOM
  marcarAsistenciaDia(): void {
    if (this.yaChecoHoy()) return;

    const coordenadasDefecto = {
      latitud: 19.5048,
      longitud: -99.1463,
    };

    this.authService.marcar_asistencia(coordenadasDefecto).subscribe({
      next: (respuesta) => {
        if (respuesta && respuesta.status === 'success' && respuesta.data.dentro_zona) {
          // Agregamos la nueva asistencia directamente al estado para pintar el calendario al instante
          this.asistencias.update((lista) => [...lista, respuesta.data]);
          this.triggerToast('Asistencia registrada con éxito en el sistema.');
        } else {
          this.triggerToast('No te encuentras dentro del área cercana permitida para checar.');
        }
      },
      error: (err) => {
        console.error('Error en marcar_asistencia:', err);
        this.triggerToast('No se pudo validar tu ubicación. Inténtalo de nuevo.');
      },
    });
  }

  // Genera la cuadrícula de días del mes seleccionado
  generarCalendario() {
    this.nombreMes = this.meses[this.mesSeleccionado];
    const primerDia = new Date(this.anioSeleccionado, this.mesSeleccionado, 1).getDay();
    const diasEnMes = new Date(this.anioSeleccionado, this.mesSeleccionado + 1, 0).getDate();

    let dia = 1;
    this.calendario = [];

    for (let i = 0; i < 6; i++) {
      let semana: number[] = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < primerDia) {
          semana.push(0);
        } else if (dia > diasEnMes) {
          semana.push(0);
        } else {
          semana.push(dia);
          dia++;
        }
      }
      this.calendario.push(semana);
      if (dia > diasEnMes) break;
    }
  }

  // Evalúa si un día en específico del calendario tiene asistencia registrada
  tieneAsistencia(dia: number): boolean {
    if (dia === 0) return false;
    const mesFormateado = String(this.mesSeleccionado + 1).padStart(2, '0');
    const diaFormateado = String(dia).padStart(2, '0');
    const fechaBuscar = `${this.anioSeleccionado}-${mesFormateado}-${diaFormateado}`;

    return this.asistencias().some((asist) => asist.fecha === fechaBuscar);
  }

  // Verifica si la celda renderizada corresponde al día de "Hoy" real
  esDiaActualReal(dia: number): boolean {
    return (
      dia === this.fechaHoyReal.getDate() &&
      this.mesSeleccionado === this.fechaHoyReal.getMonth() &&
      this.anioSeleccionado === this.fechaHoyReal.getFullYear()
    );
  }

  // Navegación de meses
  mesAnterior() {
    if (this.mesSeleccionado === 0) {
      this.mesSeleccionado = 11;
      this.anioSeleccionado--;
    } else {
      this.mesSeleccionado--;
    }
    this.generarCalendario();
  }

  mesSiguiente() {
    if (this.mesSeleccionado === 11) {
      this.mesSeleccionado = 0;
      this.anioSeleccionado++;
    } else {
      this.mesSeleccionado++;
    }
    this.generarCalendario();
  }

  // Disparador del Toast de advertencia (Cierre automático en 10s)
  triggerToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.closeToast();
    }, 10000);
  }

  closeToast(): void {
    this.toastMessage.set(null);
  }
}
