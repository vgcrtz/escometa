import { Component, signal } from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { BarraSuperiorEscom } from './barra-superior-escom/barra-superior-escom';

@Component({
  selector: 'app-root',
  imports: [BarraSuperiorEscom, RouterOutlet],
  templateUrl: 'app.html',
  styleUrl: 'app.css'
})

export class App {

}
