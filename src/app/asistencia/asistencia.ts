import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-asistencia',
  imports: [],
  templateUrl: './asistencia.html',
  styleUrl: './asistencia.css',
})
export class Asistencia implements OnInit{
meses: string[] = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];

  fechaActual = new Date();
  diaActual = this.fechaActual.getDate();
  mesActual = this.fechaActual.getMonth();
  anioActual = this.fechaActual.getFullYear();

  mesSeleccionado = this.mesActual;
  anioSeleccionado = this.anioActual;
  nombreMes = this.meses[this.mesSeleccionado];

  calendario: number[][] = [];

  ngOnInit() {
    this.generarCalendario();
  }

  generarCalendario() {
    this.nombreMes = this.meses[this.mesSeleccionado];
    const primerDia = new Date(this.anioSeleccionado, this.mesSeleccionado, 1).getDay();
    const diasEnMes = new Date(this.anioSeleccionado, this.mesSeleccionado + 1, 0).getDate();

    let dia = 1;
    this.calendario = [];

    for (let i = 0; i < 6; i++) {
      let semana: number[] = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < primerDia) {
          semana.push(0);
        } else if (dia > diasEnMes) {
          semana.push(0);
        } else {
          semana.push(dia);
          dia++;
        }
      }
      this.calendario.push(semana);
      if (dia > diasEnMes) {
        break;
      }
    }
  }

  mesAnterior() {
    if (this.mesSeleccionado === 0) {
      this.mesSeleccionado = 11;
      this.anioSeleccionado--;
    } else {
      this.mesSeleccionado--;
    }
    this.generarCalendario();
  }

  mesSiguiente() {
    if (this.mesSeleccionado === 11) {
      this.mesSeleccionado = 0;
      this.anioSeleccionado++;
    } else {
      this.mesSeleccionado++;
    }
    this.generarCalendario();
  }
}
