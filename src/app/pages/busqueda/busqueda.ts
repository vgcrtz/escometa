import { Component } from '@angular/core';

@Component({
  selector: 'app-busqueda',
  standalone: true,
  imports: [],
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.css'
})
export class Busqueda {

  filtroSeleccionado = 'todo';

  seleccionarFiltro(nombre: string) {
    this.filtroSeleccionado = nombre;
  }

}