import { Component, inject, OnInit, signal } from '@angular/core';
import {FormGroup, FormBuilder, Validators, ReactiveFormsModule} from '@angular/forms';
import { Auth } from '../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  public loginForm!: FormGroup;

  public toastMessage = signal<string | null>(null);
  public showResendVerification = signal<boolean>(false);
  public showSupportLink = signal<boolean>(false);

  private authService = inject(Auth);
  private router = inject(Router);

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', Validators.required],
      rememberMe: [false],
    });
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      this.closeToast(); // Limpiar cualquier mensaje previo

      const parametros = this.loginForm.value;

      this.authService.enviarLoginPost(parametros).subscribe({
        next: (respuesta) => {
          this.authService.isLoggedIn.set(true);
          this.authService.userRol.set(respuesta.data.rol);

          if (respuesta.status === 'success') {
            this.router.navigate(['/inicio']);
          }
        },
        error: (err) => {
          const detail = err.error?.detail || err.detail;

          if (detail === 'Credenciales inválidas') {
            this.triggerToast('Correo electrónico o contraseña incorrectos.');
          } else if (detail === 'Usuario desactivado') {
            this.showSupportLink.set(true);
            this.triggerToast('Tu cuenta ha sido desactivada.');
          } else if (
            detail === 'Cuenta no verificada. Verifica tu correo antes de iniciar sesión'
          ) {
            this.showResendVerification.set(true);
            this.triggerToast('Debes verificar tu correo para ingresar.');
          } else {
            this.triggerToast('Ocurrió un error inesperado. Inténtalo más tarde.');
          }

          console.error('Error de login:', err);
        }
      });
    }
  }

  triggerToast(msg: string): void {
    this.toastMessage.set(msg);

    if (!this.showResendVerification() && !this.showSupportLink()) {
      setTimeout(() => {
        this.closeToast();
      }, 15000);
    }
  }

  closeToast(): void {
    console.log('Cerrando toast');
    this.toastMessage.set(null);
    this.showResendVerification.set(false);
    this.showSupportLink.set(false);
  }

  onGuestLogin(): void {
    this.authService.enviarPeticionGuest({}).subscribe({
      next: (respuesta) => {
        console.log('Respuesta del servidor:', respuesta);
        this.authService.isLoggedIn.set(true);
        this.authService.userRol.set(respuesta.data.rol);

        if (respuesta.status === 'success') {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => {
        console.error('Error de login:', err);
      },
    });
  }

  onResendVerification(): void {
    const correoActual = this.loginForm.get('correo')?.value;
    console.log('Reenviando correo a:', correoActual);

    this.showResendVerification.set(false);
    this.showSupportLink.set(false);

    this.authService.reenviarVerificacionCorreo(correoActual).subscribe({
      next: (respuesta) => {
        if (respuesta.status === 'success') {
          this.triggerToast('Código de verificación reenviado con éxito. Revisa tu correo.');

          setTimeout(() => {
            this.router.navigate(['/inicio-sesion']);
          }, 3000); // 3 segundos para que alcancen a leer el mensaje de éxito
        }
      },
      error: (err) => {
        // Extraemos el detalle del error que manda FastAPI
        const detail = err.error?.detail || err.detail;

        if (detail === 'Usuario no encontrado') {
          this.triggerToast('El usuario no se encontró. Verifica que el correo esté bien escrito.');
        } else if (detail === 'La cuenta ya está verificada') {
          this.triggerToast(
            'Esta cuenta ya está verificada. Ya puedes iniciar sesión directamente.',
          );
        } else {
          // Manejo por si ocurre una caída de red o un error 500 en este endpoint
          this.triggerToast('No se pudo reenviar el código. Inténtalo de nuevo más tarde.');
        }

        console.error('Error en reenvío de verificación:', err);
      },
    });
  }
}
