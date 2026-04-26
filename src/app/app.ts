import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './registro/registro.html',
  styleUrl: './registro/registro.css'
})
export class App {
  protected readonly title = signal('ESCOMETA');
}
