import { Routes } from '@angular/router';
import {Registro} from './registro/registro';
import {Login} from './login/login';
import {Informativo} from './informativo/informativo';

// AGREGAR SUS RUTAS Y EL COMPONENTE
export const routes: Routes = [
  { path: '', redirectTo: '/informativo', pathMatch: 'full' },
  { path: 'informativo', component: Informativo},
  { path: 'registro', component: Registro },
  { path: 'iniciar-sesion', component: Login },
];
