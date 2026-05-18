import { Component, inject, OnInit } from '@angular/core';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-barra-superior-escom',
  standalone: true,
  imports: [],
  templateUrl: './barra-superior-escom.html',
  styleUrl: './barra-superior-escom.css',
})
export class BarraSuperiorEscom {
  private authService = inject(Auth);

  isLoggedIn = this.authService.isLoggedIn;
  public userRol = this.authService.userRol;
}
