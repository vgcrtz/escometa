import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private http = inject(HttpClient);
  private baseURL = 'http://localhost:8000';

  isLoggedIn = signal<boolean>(false);
  userRol = signal<string | null>(null);

  verificarSesion(): Observable<any> {
    return this.http.get(`${this.baseURL}/auth/me`, { withCredentials: true }).pipe(
      tap((respuesta: any) => {
        console.log('Respuesta de verificación de sesión:', respuesta);
        if (respuesta.authenticated === true || respuesta.data.tipo_usuario === 'INVITADO') {
          this.isLoggedIn.set(true);
          this.userRol.set(respuesta.data.tipo_usuario);
        } else {
          this.isLoggedIn.set(false);
          this.userRol.set(null);
        }
      }),
      catchError((error) => {
        this.isLoggedIn.set(false);
        this.userRol.set(null);
        return of(null);
      }),
    );
  }

  enviarLoginPost(data: any): Observable<any> {
    return this.http.post(`${this.baseURL}/auth/login`, data, { withCredentials: true });
  }

  enviarRegistroPost(data: any): Observable<any> {
    return this.http.post(`${this.baseURL}/auth/register`, data);
  }

  enviarPeticionGuest(data: any): Observable<any> {
    return this.http.post(`${this.baseURL}/auth/guest`, data);
  }

  reenviarVerificacionCorreo(correo: string): Observable<any> {
    return this.http.post(`${this.baseURL}/auth/resend-code`, { correo });
  }

  cerrar_sesion(): Observable<any> {
    return this.http.post(`${this.baseURL}/auth/logout`, {}, { withCredentials: true });
  }

  obtener_datos_usuario(): Observable<any> {
    return this.http.get(`${this.baseURL}/auth/me`, { withCredentials: true });
  }

  obtener_mis_asistencias(): Observable<any> {
    return this.http.get(`${this.baseURL}/asistencias/mis-asistencias`, { withCredentials: true });
  }

  marcar_asistencia(data: any): Observable<any> {
    return this.http.post(`${this.baseURL}/asistencias/registrar`, data, { withCredentials: true });
  }

  subir_foto_perfil(data: any): Observable<any> {
    const body = { foto_perfil_url: data };
    return this.http.put(`${this.baseURL}/usuarios/me/foto`, body, { withCredentials: true });
  }

  /*
  obtener_sesiones(grupo: any): Observable<any>{
    return this.http.get(`${this.baseURL}/sesiones/grupo/${grupo}`, { withCredentials: true });
  }

  obtener_alumnos_grupo(grupo: any): Observable<any>{
    return this.http.get(`${this.baseURL}/grupos/${grupo}/alumnos`,{withCredentials: true});
  }*/
}
