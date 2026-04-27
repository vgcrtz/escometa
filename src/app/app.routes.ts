import { Routes } from '@angular/router';
import {Registro} from './registro/registro';
import {Login} from './login/login';

// AGREGAR SUS RUTAS Y EL COMPONENTE
export const routes: Routes = [
  { path: 'registro', component: Registro },
  { path: 'iniciar-sesion', component: Login },
];
