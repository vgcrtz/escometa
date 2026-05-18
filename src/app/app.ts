import { Component, signal, inject, OnInit } from '@angular/core';
import {RouterOutlet, NavigationEnd, Router} from '@angular/router';
import { filter } from 'rxjs/operators';
import { BarraSuperiorEscom } from './barra-superior-escom/barra-superior-escom';
import { TituloSesion } from './titulo-sesion/titulo-sesion';

@Component({
  selector: 'app-root',
  imports: [BarraSuperiorEscom, RouterOutlet, TituloSesion],
  templateUrl: 'app.html',
  styleUrl: 'app.css',
})
export class App implements OnInit {
  private router = inject(Router);

  public showSubHeader = signal<boolean>(true);

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        const cleanUrl = url.split('?')[0].split('#')[0];

        const esconderBarra = cleanUrl === '/iniciar-sesion' || cleanUrl === '/registro';

        this.showSubHeader.set(!esconderBarra);
      });
  }
}
