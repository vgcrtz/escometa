import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { variables_globales } from '../variables-globales';

export interface UsuarioChat {
  id_usuario: number;
  nombre?: string;
  nombre_usuario?: string;
  correo?: string;
  foto_perfil_url?: string | null;
  rol_chat?: string;
}

export interface ChatConversacion {
  id_conversacion: number;
  tipo: 'DIRECTO' | 'GRUPO' | string;
  titulo?: string | null;
  creado_por?: number;
  fecha_creacion?: string;
  actualizado_en?: string;
  activo?: boolean;
  participantes?: UsuarioChat[];
  usuario_directo?: UsuarioChat;
  ultimo_mensaje?: string | null;
  no_leidos?: number;
}

export interface ChatAdjunto {
  id_adjunto?: number;
  url: string;
  path_storage?: string | null;
  nombre_original?: string | null;
  tipo_mime?: string | null;
  tamano_bytes?: number | null;
}

export interface ChatMensaje {
  id_mensaje: number;
  id_conversacion: number;
  id_emisor: number;
  emisor?: UsuarioChat;
  contenido?: string | null;
  tipo: 'TEXTO' | 'IMAGEN' | 'ARCHIVO' | 'SISTEMA' | string;
  fecha_envio: string;
  fecha_edicion?: string | null;
  editado?: boolean;
  eliminado?: boolean;
  id_mensaje_respuesta?: number | null;
  adjuntos?: ChatAdjunto[];
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private api = variables_globales.server_url.replace(/\/$/, '');

  listarChats(): Observable<ApiResponse<ChatConversacion[]>> {
    return this.http.get<ApiResponse<ChatConversacion[]>>(`${this.api}/chats`, {
      withCredentials: true,
    });
  }

  obtenerChat(idConversacion: number): Observable<ApiResponse<ChatConversacion>> {
    return this.http.get<ApiResponse<ChatConversacion>>(`${this.api}/chats/${idConversacion}`, {
      withCredentials: true,
    });
  }

  listarMensajes(
    idConversacion: number,
    limit = 50,
    offset = 0,
  ): Observable<ApiResponse<ChatMensaje[]>> {
    return this.http.get<ApiResponse<ChatMensaje[]>>(
      `${this.api}/chats/${idConversacion}/mensajes`,
      {
        params: { limit, offset },
        withCredentials: true,
      },
    );
  }

  enviarMensaje(
    idConversacion: number,
    payload: {
      contenido?: string | null;
      tipo?: string;
      id_mensaje_respuesta?: number | null;
      adjuntos?: ChatAdjunto[] | null;
    },
  ): Observable<ApiResponse<ChatMensaje>> {
    return this.http.post<ApiResponse<ChatMensaje>>(
      `${this.api}/chats/${idConversacion}/mensajes`,
      payload,
      { withCredentials: true },
    );
  }

  editarMensaje(idMensaje: number, contenido: string): Observable<ApiResponse<ChatMensaje>> {
    return this.http.put<ApiResponse<ChatMensaje>>(
      `${this.api}/chats/mensajes/${idMensaje}`,
      { contenido },
      { withCredentials: true },
    );
  }

  eliminarMensaje(idMensaje: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.api}/chats/mensajes/${idMensaje}`, {
      withCredentials: true,
    });
  }

  crearChatDirecto(idUsuarioDestino: number): Observable<ApiResponse<ChatConversacion>> {
    return this.http.post<ApiResponse<ChatConversacion>>(
      `${this.api}/chats/directo`,
      { id_usuario_destino: idUsuarioDestino },
      { withCredentials: true },
    );
  }

  crearChatDirectoPorNickname(nicknameDestino: string): Observable<ApiResponse<ChatConversacion>> {
    return this.http.post<ApiResponse<ChatConversacion>>(
      `${this.api}/chats/directo/nickname`,
      { nickname_destino: nicknameDestino },
      { withCredentials: true },
    );
  }

  crearChatGrupal(titulo: string, participantes: number[]): Observable<ApiResponse<ChatConversacion>> {
    return this.http.post<ApiResponse<ChatConversacion>>(
      `${this.api}/chats/grupal`,
      { titulo, participantes },
      { withCredentials: true },
    );
  }

  crearChatGrupalPorNicknames(titulo: string, participantes: string[]): Observable<ApiResponse<ChatConversacion>> {
    return this.http.post<ApiResponse<ChatConversacion>>(
      `${this.api}/chats/grupal/nicknames`,
      { titulo, participantes },
      { withCredentials: true },
    );
  }

  actualizarChat(
    idConversacion: number,
    payload: { titulo?: string; activo?: boolean },
  ): Observable<ApiResponse<ChatConversacion>> {
    return this.http.put<ApiResponse<ChatConversacion>>(
      `${this.api}/chats/${idConversacion}`,
      payload,
      { withCredentials: true },
    );
  }

  eliminarChat(idConversacion: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.api}/chats/${idConversacion}`, {
      withCredentials: true,
    });
  }

  agregarParticipante(
    idConversacion: number,
    idUsuario: number,
    rol = 'MIEMBRO',
  ): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${this.api}/chats/${idConversacion}/participantes`,
      { id_usuario: idUsuario, rol },
      { withCredentials: true },
    );
  }

  removerParticipante(idConversacion: number, idUsuario: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.api}/chats/${idConversacion}/participantes/${idUsuario}`,
      { withCredentials: true },
    );
  }

  marcarChatLeido(idConversacion: number): Observable<ApiResponse<{ actualizadas: number }>> {
    return this.http.put<ApiResponse<{ actualizadas: number }>>(
      `${this.api}/chats/${idConversacion}/leer`,
      {},
      { withCredentials: true },
    );
  }

  contarNoLeidos(): Observable<ApiResponse<{ no_leidos: number }>> {
    return this.http.get<ApiResponse<{ no_leidos: number }>>(`${this.api}/chats/no-leidos`, {
      withCredentials: true,
    });
  }

  obtenerUsuarioActual(): Observable<ApiResponse<UsuarioChat>> {
    return this.http.get<ApiResponse<UsuarioChat>>(`${this.api}/auth/me`, {
      withCredentials: true,
    });
  }
}
