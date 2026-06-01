import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { ChatbotMessage, ChatbotService, ChatbotFuente } from '../services/chatbot';

interface UiMessage extends ChatbotMessage {
  fuentes?: ChatbotFuente[];
  error?: boolean;
}

const CHATBOT_STORAGE_KEY = 'escometa.chatbot.mensajes.v1';

const MENSAJE_INICIAL: UiMessage = {
  role: 'assistant',
  content:
    'Hola. Soy el asistente de ESCOMETA. Puedo ayudarte con dudas sobre el sistema, anuncios publicados, horarios, materias, asistencia y procesos escolares con apoyo de fuentes oficiales.',
};

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, MarkdownComponent],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class Chatbot {
  private chatbotService = inject(ChatbotService);
  readonly asistenteAvatar = 'asistente-escometa.svg';
  readonly asistenteCarga = 'escombro.ico'

  pregunta = signal('');
  mensajes = signal<UiMessage[]>(this.cargarMensajes());
  cargando = signal(false);
  usarInternet = signal(true);

  ejemplos = [
    '¿Cómo registro mi asistencia?',
    '¿Qué anuncios recientes tengo?',
    '¿Cómo veo mis materias y horario?',
    '¿Dónde verifico trámites oficiales de ESCOM?',
  ];

  enviar(): void {
    const texto = this.pregunta().trim();
    if (!texto || this.cargando()) return;

    const historial = this.mensajes()
      .filter((m) => !m.error)
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));

    this.actualizarMensajes((mensajes) => [...mensajes, { role: 'user', content: texto }]);

    this.pregunta.set('');
    this.cargando.set(true);

    this.chatbotService.preguntar(texto, historial, this.usarInternet()).subscribe({
      next: (respuesta) => {
        this.actualizarMensajes((mensajes) => [
          ...mensajes,
          {
            role: 'assistant',
            content: respuesta.data.respuesta,
            fuentes: respuesta.data.fuentes || [],
          },
        ]);
        this.cargando.set(false);
      },
      error: (error) => {
        const detalle = error?.error?.detail || 'No se pudo conectar con el asistente.';

        this.actualizarMensajes((mensajes) => [
          ...mensajes,
          {
            role: 'assistant',
            content: `Ocurrió un problema: ${detalle}`,
            error: true,
          },
        ]);

        this.cargando.set(false);
      },
    });
  }

  usarEjemplo(texto: string): void {
    this.pregunta.set(texto);
    this.enviar();
  }

  limpiar(): void {
    this.borrarMensajesGuardados();

    this.mensajes.set([
      {
        role: 'assistant',
        content: 'Chat reiniciado. ¿Qué necesitas saber sobre ESCOMETA o la escuela?',
      },
    ]);
  }

  toggleInternet(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.usarInternet.set(input.checked);
  }

  private actualizarMensajes(actualizador: (mensajes: UiMessage[]) => UiMessage[]): void {
    this.mensajes.update(actualizador);
    this.guardarMensajes();
  }

  private cargarMensajes(): UiMessage[] {
    const storage = this.obtenerStorage();
    if (!storage) return [{ ...MENSAJE_INICIAL }];

    try {
      const raw = storage.getItem(CHATBOT_STORAGE_KEY);
      if (!raw) return [{ ...MENSAJE_INICIAL }];

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [{ ...MENSAJE_INICIAL }];
      }

      const mensajesValidos = parsed.filter((mensaje: any) => this.esMensajeValido(mensaje));

      return mensajesValidos.length > 0 ? mensajesValidos : [{ ...MENSAJE_INICIAL }];
    } catch {
      return [{ ...MENSAJE_INICIAL }];
    }
  }

  private guardarMensajes(): void {
    const storage = this.obtenerStorage();
    if (!storage) return;

    try {
      const mensajesLimpios = this.mensajes()
        .filter((mensaje) => this.esMensajeValido(mensaje))
        .map((mensaje) => ({
          role: mensaje.role,
          content: mensaje.content,
          fuentes: mensaje.fuentes || [],
          error: mensaje.error || false,
        }));

      storage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(mensajesLimpios));
    } catch {
      console.warn('No se pudo guardar el historial del chatbot en localStorage.');
    }
  }

  private borrarMensajesGuardados(): void {
    const storage = this.obtenerStorage();
    if (!storage) return;

    try {
      storage.removeItem(CHATBOT_STORAGE_KEY);
    } catch {
      console.warn('No se pudo borrar el historial del chatbot en localStorage.');
    }
  }

  private esMensajeValido(mensaje: any): mensaje is UiMessage {
    return (
      mensaje &&
      (mensaje.role === 'user' || mensaje.role === 'assistant') &&
      typeof mensaje.content === 'string'
    );
  }

  private obtenerStorage(): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }
}
