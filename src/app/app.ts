import { Component } from '@angular/core';
import { Busqueda } from './pages/busqueda/busqueda';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Busqueda],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

}