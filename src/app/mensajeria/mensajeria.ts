import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ChatAdjunto,
  ChatConversacion,
  ChatMensaje,
  ChatService,
  UsuarioChat,
} from '../services/chat.service';

type OrdenLista = 'recientes' | 'antiguedad' | 'nombre';
type TamanoFuente = 'pequeña' | 'normal' | 'grande';
type FuenteChat = 'Roboto' | 'Arial' | 'Georgia' | 'Courier New';

@Component({
  selector: 'app-mensajeria',
  imports: [CommonModule, FormsModule],
  templateUrl: './mensajeria.html',
  styleUrl: './mensajeria.css',
})
export class Mensajeria implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private pollingId: ReturnType<typeof setInterval> | null = null;
  private ultimoTotalNoLeidos = 0;
  private primeraCargaNoLeidos = true;

  @ViewChild('scrollMensajes') private scrollMensajes?: ElementRef<HTMLDivElement>;

  public usuarioActual = signal<UsuarioChat | null>(null);
  public conversaciones = signal<ChatConversacion[]>([]);
  public mensajes = signal<ChatMensaje[]>([]);
  public chatSeleccionado = signal<ChatConversacion | null>(null);

  public cargandoChats = signal<boolean>(false);
  public cargandoMensajes = signal<boolean>(false);
  public enviandoMensaje = signal<boolean>(false);
  public error = signal<string>('');
  public aviso = signal<string>('');

  public textoMensaje = signal<string>('');
  public urlAdjunto = signal<string>('');
  public nombreAdjunto = signal<string>('');

  public mostrarOrdenGrupos = signal<boolean>(false);
  public mostrarOpcionesPrivado = signal<boolean>(false);
  public mostrarNuevoDirecto = signal<boolean>(false);
  public mostrarNuevoGrupo = signal<boolean>(false);
  public mostrarAdjunto = signal<boolean>(false);
  public mostrarEditarGrupo = signal<boolean>(false);

  public ordenGrupos = signal<OrdenLista>('recientes');
  public filtroPrivados = signal<OrdenLista>('recientes');
  public fuenteChat = signal<FuenteChat>('Roboto');
  public tamanoFuente = signal<TamanoFuente>('normal');

  public nuevoDirectoNickname = signal<string>('');
  public nuevoGrupoTitulo = signal<string>('');
  public nuevoGrupoParticipantes = signal<string>('');
  public tituloEditado = signal<string>('');

  public grupos = computed(() => {
    const lista = this.conversaciones().filter((chat) => this.esGrupo(chat));
    return this.ordenarConversaciones(lista, this.ordenGrupos());
  });

  public privados = computed(() => {
    const lista = this.conversaciones().filter((chat) => this.esPrivado(chat));
    return this.ordenarConversaciones(lista, this.filtroPrivados());
  });

  public clasesFuente = computed(() => ({
    'font-small': this.tamanoFuente() === 'pequeña',
    'font-normal': this.tamanoFuente() === 'normal',
    'font-large': this.tamanoFuente() === 'grande',
  }));

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarChats(true);
    this.solicitarPermisoNotificaciones();
    this.iniciarPolling();
  }

  ngOnDestroy(): void {
    if (this.pollingId) {
      clearInterval(this.pollingId);
    }
  }

  cargarUsuarioActual(): void {
    this.chatService.obtenerUsuarioActual().subscribe({
      next: (res: any) => {
        const data = res?.data || null;
        this.usuarioActual.set(data);
      },
      error: () => {
        this.usuarioActual.set(null);
      },
    });
  }

  cargarChats(silencioso = false): void {
    if (!silencioso) this.cargandoChats.set(true);

    this.chatService.listarChats().subscribe({
      next: (res) => {
        const chats = (res?.data || []).map((chat) => this.normalizarChat(chat));
        const seleccionado = this.chatSeleccionado();

        this.conversaciones.set(chats);

        if (seleccionado) {
          const actualizado = chats.find((chat) => chat.id_conversacion === seleccionado.id_conversacion);
          if (actualizado) this.chatSeleccionado.set({ ...seleccionado, ...actualizado });
        }

        this.cargandoChats.set(false);
      },
      error: (err) => {
        this.cargandoChats.set(false);
        this.mostrarError(err, 'No se pudieron cargar las conversaciones.');
      },
    });
  }

  seleccionarChat(chat: ChatConversacion): void {
    this.chatSeleccionado.set(chat);
    this.tituloEditado.set(chat.titulo || this.obtenerTituloChat(chat));
    this.mostrarEditarGrupo.set(false);
    this.cargarMensajes(chat.id_conversacion);
    this.chatService.marcarChatLeido(chat.id_conversacion).subscribe({
      next: () => this.cargarChats(true),
      error: () => {},
    });
  }

  cargarMensajes(idConversacion: number, silencioso = false): void {
    if (!silencioso) this.cargandoMensajes.set(true);

    this.chatService.listarMensajes(idConversacion, 80, 0).subscribe({
      next: (res) => {
        const anteriores = this.mensajes().length;
        const mensajesNuevos = res?.data || [];

        this.mensajes.set(mensajesNuevos);
        this.cargandoMensajes.set(false);

        queueMicrotask(() => this.bajarScroll());

        if (silencioso && mensajesNuevos.length > anteriores) {
          const ultimo = mensajesNuevos[mensajesNuevos.length - 1];
          if (ultimo && ultimo.id_emisor !== this.usuarioActual()?.id_usuario) {
            this.notificarMensajeEntrante(ultimo);
          }
        }
      },
      error: (err) => {
        this.cargandoMensajes.set(false);
        this.mostrarError(err, 'No se pudieron cargar los mensajes.');
      },
    });
  }

  enviarMensaje(): void {
    const chat = this.chatSeleccionado();
    const contenido = this.textoMensaje().trim();
    const adjunto = this.construirAdjunto();

    if (!chat || (!contenido && !adjunto)) return;

    this.enviandoMensaje.set(true);

    this.chatService.enviarMensaje(chat.id_conversacion, {
      contenido: contenido || null,
      tipo: adjunto ? 'ARCHIVO' : 'TEXTO',
      adjuntos: adjunto ? [adjunto] : null,
    }).subscribe({
      next: () => {
        this.textoMensaje.set('');
        this.urlAdjunto.set('');
        this.nombreAdjunto.set('');
        this.mostrarAdjunto.set(false);
        this.enviandoMensaje.set(false);
        this.cargarMensajes(chat.id_conversacion, true);
        this.cargarChats(true);
      },
      error: (err) => {
        this.enviandoMensaje.set(false);
        this.mostrarError(err, 'No se pudo enviar el mensaje.');
      },
    });
  }

  crearDirecto(): void {
    const nickname = this.limpiarNickname(this.nuevoDirectoNickname());

    if (!nickname) {
      this.error.set('Ingresa un nickname válido.');
      return;
    }

    this.chatService.crearChatDirectoPorNickname(nickname).subscribe({
      next: (res) => {
        const chat = this.normalizarChat(res.data);
        this.mostrarNuevoDirecto.set(false);
        this.nuevoDirectoNickname.set('');
        this.cargarChats(true);
        this.seleccionarChat(chat);
        this.avisoTemporal('Chat privado listo.');
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear el chat privado.'),
    });
  }

  crearGrupo(): void {
    const titulo = this.nuevoGrupoTitulo().trim();
    const participantes = this.parsearNicknames(this.nuevoGrupoParticipantes());

    if (!titulo) {
      this.error.set('Ingresa un nombre para el grupo.');
      return;
    }

    if (participantes.length < 2) {
      this.error.set('Ingresa al menos dos nicknames de participantes para crear un grupo.');
      return;
    }

    this.chatService.crearChatGrupalPorNicknames(titulo, participantes).subscribe({
      next: (res) => {
        const chat = this.normalizarChat(res.data);
        this.mostrarNuevoGrupo.set(false);
        this.nuevoGrupoTitulo.set('');
        this.nuevoGrupoParticipantes.set('');
        this.cargarChats(true);
        this.seleccionarChat(chat);
        this.avisoTemporal('Grupo creado correctamente.');
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear el grupo.'),
    });
  }

  guardarTituloGrupo(): void {
    const chat = this.chatSeleccionado();
    const titulo = this.tituloEditado().trim();

    if (!chat || !titulo || !this.esGrupo(chat)) return;

    this.chatService.actualizarChat(chat.id_conversacion, { titulo }).subscribe({
      next: (res) => {
        const actualizado = this.normalizarChat(res.data);
        this.chatSeleccionado.set({ ...chat, ...actualizado });
        this.mostrarEditarGrupo.set(false);
        this.cargarChats(true);
        this.avisoTemporal('Nombre del grupo actualizado.');
      },
      error: (err) => this.mostrarError(err, 'No se pudo actualizar el grupo.'),
    });
  }

  eliminarChatActual(): void {
    const chat = this.chatSeleccionado();
    if (!chat) return;

    const seguro = window.confirm(`¿Eliminar "${this.obtenerTituloChat(chat)}"?`);
    if (!seguro) return;

    this.chatService.eliminarChat(chat.id_conversacion).subscribe({
      next: () => {
        this.chatSeleccionado.set(null);
        this.mensajes.set([]);
        this.cargarChats(true);
        this.avisoTemporal('Conversación eliminada.');
      },
      error: (err) => this.mostrarError(err, 'No se pudo eliminar la conversación.'),
    });
  }

  eliminarMensaje(mensaje: ChatMensaje): void {
    const seguro = window.confirm('¿Eliminar este mensaje?');
    if (!seguro) return;

    this.chatService.eliminarMensaje(mensaje.id_mensaje).subscribe({
      next: () => {
        const chat = this.chatSeleccionado();
        if (chat) this.cargarMensajes(chat.id_conversacion, true);
      },
      error: (err) => this.mostrarError(err, 'No se pudo eliminar el mensaje.'),
    });
  }

  editarMensaje(mensaje: ChatMensaje): void {
    if (mensaje.eliminado) return;

    const nuevoContenido = window.prompt('Editar mensaje:', mensaje.contenido || '');
    if (nuevoContenido === null || !nuevoContenido.trim()) return;

    this.chatService.editarMensaje(mensaje.id_mensaje, nuevoContenido.trim()).subscribe({
      next: () => {
        const chat = this.chatSeleccionado();
        if (chat) this.cargarMensajes(chat.id_conversacion, true);
      },
      error: (err) => this.mostrarError(err, 'No se pudo editar el mensaje.'),
    });
  }

  esMensajeMio(mensaje: ChatMensaje): boolean {
    return !!this.usuarioActual()?.id_usuario && mensaje.id_emisor === this.usuarioActual()?.id_usuario;
  }

  esGrupo(chat: ChatConversacion): boolean {
    const totalParticipantes = chat.participantes?.length || 0;
    return chat.tipo === 'GRUPO' || totalParticipantes > 2;
  }

  esPrivado(chat: ChatConversacion): boolean {
    const totalParticipantes = chat.participantes?.length || 0;
    return chat.tipo === 'DIRECTO' || totalParticipantes === 2 || (!!chat.usuario_directo && chat.tipo !== 'GRUPO');
  }

  obtenerTituloChat(chat: ChatConversacion | null): string {
    if (!chat) return 'Conversación';

    if (this.esPrivado(chat)) {
      return chat.usuario_directo?.nombre
        || chat.usuario_directo?.nombre_usuario
        || chat.titulo
        || 'Chat privado';
    }

    return chat.titulo || 'Grupo sin nombre';
  }

  obtenerSubtituloChat(chat: ChatConversacion | null): string {
    if (!chat) return '';

    if (this.esPrivado(chat)) {
      return chat.usuario_directo?.correo || 'Conversación privada';
    }

    const total = chat.participantes?.length;
    return total ? `${total} participantes` : 'Grupo';
  }

  obtenerInicial(chat: ChatConversacion): string {
    return this.obtenerTituloChat(chat).trim().charAt(0).toUpperCase() || '?';
  }

  cambiarOrdenGrupos(orden: OrdenLista): void {
    this.ordenGrupos.set(orden);
    this.mostrarOrdenGrupos.set(false);
  }

  cambiarFiltroPrivados(orden: OrdenLista): void {
    this.filtroPrivados.set(orden);
  }

  cambiarFuente(fuente: FuenteChat): void {
    this.fuenteChat.set(fuente);
  }

  cambiarTamano(tamano: TamanoFuente): void {
    this.tamanoFuente.set(tamano);
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackChat(_: number, chat: ChatConversacion): number {
    return chat.id_conversacion;
  }

  trackMensaje(_: number, mensaje: ChatMensaje): number {
    return mensaje.id_mensaje;
  }

  private iniciarPolling(): void {
    this.pollingId = setInterval(() => {
      this.cargarChats(true);
      this.revisarNoLeidos();

      const chat = this.chatSeleccionado();
      if (chat) {
        this.cargarMensajes(chat.id_conversacion, true);
        this.chatService.marcarChatLeido(chat.id_conversacion).subscribe({
          next: () => {},
          error: () => {},
        });
      }
    }, 7000);
  }

  private revisarNoLeidos(): void {
    this.chatService.contarNoLeidos().subscribe({
      next: (res) => {
        const total = res?.data?.no_leidos || 0;

        if (this.primeraCargaNoLeidos) {
          this.ultimoTotalNoLeidos = total;
          this.primeraCargaNoLeidos = false;
          return;
        }

        if (total > this.ultimoTotalNoLeidos) {
          this.notificarTexto('Nuevo mensaje', `Tienes ${total} mensaje(s) sin leer.`);
          this.avisoTemporal(`Tienes ${total} mensaje(s) sin leer.`);
        }

        this.ultimoTotalNoLeidos = total;
      },
      error: () => {},
    });
  }

  private ordenarConversaciones(lista: ChatConversacion[], orden: OrdenLista): ChatConversacion[] {
    const copia = [...lista];

    if (orden === 'nombre') {
      return copia.sort((a, b) => this.obtenerTituloChat(a).localeCompare(this.obtenerTituloChat(b)));
    }

    return copia.sort((a, b) => {
      const fechaA = new Date(a.actualizado_en || a.fecha_creacion || 0).getTime();
      const fechaB = new Date(b.actualizado_en || b.fecha_creacion || 0).getTime();

      return orden === 'antiguedad' ? fechaA - fechaB : fechaB - fechaA;
    });
  }

  private normalizarChat(chat: ChatConversacion): ChatConversacion {
    return {
      ...chat,
      participantes: chat.participantes || [],
      titulo: chat.titulo || null,
    };
  }

  private construirAdjunto(): ChatAdjunto | null {
    const url = this.urlAdjunto().trim();
    if (!url) return null;

    const nombre = this.nombreAdjunto().trim() || url.split('/').pop() || 'Archivo';

    return {
      url,
      nombre_original: nombre,
      path_storage: null,
      tipo_mime: null,
      tamano_bytes: null,
    };
  }

  private limpiarNickname(nickname: string): string {
    return (nickname || '').trim().replace(/^@+/, '').trim();
  }

  private parsearNicknames(valor: string): string[] {
    return valor
      .split(',')
      .map((nickname) => this.limpiarNickname(nickname))
      .filter((nickname) => nickname.length > 0)
      .filter((nickname, index, array) => array.indexOf(nickname) === index);
  }

  private bajarScroll(): void {
    const contenedor = this.scrollMensajes?.nativeElement;
    if (!contenedor) return;
    contenedor.scrollTop = contenedor.scrollHeight;
  }

  private solicitarPermisoNotificaciones(): void {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  private notificarMensajeEntrante(mensaje: ChatMensaje): void {
    const emisor = mensaje.emisor?.nombre || mensaje.emisor?.nombre_usuario || 'Nuevo mensaje';
    const contenido = mensaje.contenido || 'Te enviaron un archivo.';
    this.notificarTexto(emisor, contenido);
    this.avisoTemporal(`${emisor}: ${contenido}`);
  }

  private notificarTexto(titulo: string, contenido: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, {
        body: contenido,
        icon: 'Logito.png',
      });
    }
  }

  private avisoTemporal(mensaje: string): void {
    this.aviso.set(mensaje);
    setTimeout(() => {
      if (this.aviso() === mensaje) this.aviso.set('');
    }, 3500);
  }

  private mostrarError(err: any, fallback: string): void {
    const detail = err?.error?.detail;
    const mensaje = typeof detail === 'string'
      ? detail
      : detail?.message || err?.error?.message || fallback;

    this.error.set(mensaje);
    setTimeout(() => {
      if (this.error() === mensaje) this.error.set('');
    }, 5000);
  }
}
