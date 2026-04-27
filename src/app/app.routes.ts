import { Routes } from '@angular/router';
import {Registro} from './registro/registro';
import {Login} from './login/login';
import {Busqueda} from './busqueda/busqueda';
import {Foro} from './foro/foro';
import {Mensajeria} from './mensajeria/mensajeria';
import {Horario} from './horario/horario';
import {Asistencia} from './asistencia/asistencia';

// AGREGAR SUS RUTAS Y EL COMPONENTE
export const routes: Routes = [
  { path: 'registro', component: Registro },
  { path: 'iniciar-sesion', component: Login },
  { path: 'busqueda', component: Busqueda},
  { path: 'foro', component: Foro},
  { path: 'mensajeria', component: Mensajeria},
  { path: 'horario', component: Horario},
  { path: 'asistencia', component: Asistencia},
  { path: '', redirectTo: '/iniciar-sesion', pathMatch: 'full' },
  { path: '**', redirectTo: '/iniciar-sesion'}
];
