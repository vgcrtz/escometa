import { Routes } from '@angular/router';
import {Registro} from './registro/registro';
import {Login} from './login/login';
import {Busqueda} from './busqueda/busqueda';
import {Foro} from './foro/foro';
import {Mensajeria} from './mensajeria/mensajeria';
import {Horario} from './horario/horario';
import {Asistencia} from './asistencia/asistencia';
import {Inicio} from './inicio/inicio';
import {Perfil} from './perfil/perfil';
import {Notificaciones} from './notificaciones/notificaciones';
import { Chatbot } from './chatbot/chatbot';
import { authGuard } from './guards/auth-guard';
import { guestGuard } from './guards/guest-guard';

// AGREGAR SUS RUTAS Y EL COMPONENTE
export const routes: Routes = [
  { path: 'iniciar-sesion', component: Login, canActivate: [guestGuard] },
  { path: 'registro', component: Registro, canActivate: [guestGuard] },
  { path: 'busqueda', component: Busqueda, canActivate: [authGuard] },
  { path: 'foro', component: Foro, canActivate: [authGuard] },
  { path: 'mensajeria', component: Mensajeria, canActivate: [authGuard] },
  { path: 'horario', component: Horario, canActivate: [authGuard] },
  { path: 'asistencia', component: Asistencia, canActivate: [authGuard] },
  { path: 'inicio', component: Inicio, canActivate: [authGuard] },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
  { path: 'notificaciones', component: Notificaciones, canActivate: [authGuard] },
  { path: 'chatbot', component: Chatbot, canActivate: [authGuard] },
  { path: '', redirectTo: '/iniciar-sesion', pathMatch: 'full' },
  { path: '**', redirectTo: '/iniciar-sesion' },
];
