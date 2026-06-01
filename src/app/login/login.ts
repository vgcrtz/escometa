import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../services/auth';
import { variables_globales } from '../variables-globales';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  public loginForm!: FormGroup;
  public verificationCode = new FormControl('', [Validators.required, Validators.minLength(4)]);

  public toastMessage = signal<string | null>(null);
  public showResendVerification = signal<boolean>(false);
  public showSupportLink = signal<boolean>(false);

  public showVerificationBox = signal<boolean>(false);
  public verificationEmail = signal<string>('');
  public verificationMessage = signal<string | null>(null);
  public verificationError = signal<string | null>(null);
  public isVerifying = signal<boolean>(false);
  public isResending = signal<boolean>(false);

  private authService = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);
  private apiUrl = variables_globales.server_url.replace(/\/$/, '');

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', Validators.required],
      rememberMe: [false],
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.closeToast();
    this.hideVerificationBox();

    const parametros = this.loginForm.value;

    this.authService.enviarLoginPost(parametros).subscribe({
      next: (respuesta) => {
        this.authService.isLoggedIn.set(true);
        this.authService.userRol.set(respuesta.data?.rol || respuesta.data?.tipo_usuario);

        if (respuesta.status === 'success') {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => {
        const detail = this.getErrorDetail(err);

        if (detail === 'Credenciales inválidas') {
          this.triggerToast('Correo electrónico o contraseña incorrectos.');
        } else if (detail === 'Usuario desactivado') {
          this.showSupportLink.set(true);
          this.triggerToast('Tu cuenta ha sido desactivada.');
        } else if (detail === 'Cuenta no verificada. Verifica tu correo antes de iniciar sesión') {
          this.openVerificationBox(
            this.loginForm.get('correo')?.value,
            'Tu cuenta aún no está verificada. Ingresa el código que se envió a tu correo.',
          );
        } else {
          this.triggerToast('Ocurrió un error inesperado. Inténtalo más tarde.');
        }

        console.error('Error de login:', err);
      },
    });
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
    this.toastMessage.set(null);
    this.showResendVerification.set(false);
    this.showSupportLink.set(false);
  }

  onGuestLogin(): void {
    this.authService.enviarPeticionGuest({}).subscribe({
      next: (respuesta) => {
        this.authService.isLoggedIn.set(true);
        this.authService.userRol.set(respuesta.data?.rol || respuesta.data?.tipo_usuario);

        if (respuesta.status === 'success') {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => {
        console.error('Error de login:', err);
        this.triggerToast('No se pudo iniciar sesión como invitado.');
      },
    });
  }

  openVerificationBox(correo: string, message?: string): void {
    if (!correo) {
      this.triggerToast('Ingresa tu correo electrónico para verificar la cuenta.');
      return;
    }

    this.closeToast();
    this.verificationEmail.set(correo);
    this.verificationCode.reset('');
    this.verificationError.set(null);
    this.verificationMessage.set(message || 'Ingresa el código que se envió a tu correo.');
    this.showVerificationBox.set(true);
  }

  hideVerificationBox(): void {
    this.showVerificationBox.set(false);
    this.verificationEmail.set('');
    this.verificationCode.reset('');
    this.verificationMessage.set(null);
    this.verificationError.set(null);
    this.isVerifying.set(false);
    this.isResending.set(false);
  }

  onVerifyEmail(): void {
    if (this.verificationCode.invalid || this.isVerifying()) {
      this.verificationCode.markAsTouched();
      return;
    }

    const payload = {
      correo: this.verificationEmail(),
      codigo: this.verificationCode.value,
    };

    this.isVerifying.set(true);
    this.verificationError.set(null);
    this.verificationMessage.set(null);

    this.http.post<any>(`${this.apiUrl}/auth/verify-email`, payload, { withCredentials: true }).subscribe({
      next: (respuesta) => {
        this.isVerifying.set(false);
        this.verificationMessage.set(respuesta?.message || 'Cuenta verificada correctamente. Ya puedes iniciar sesión.');
        this.verificationError.set(null);
        this.showVerificationBox.set(true);
      },
      error: (err) => {
        this.isVerifying.set(false);
        const detail = this.getErrorDetail(err);

        if (detail === 'Código inválido o expirado') {
          this.verificationError.set('El código es inválido o expiró. Solicita uno nuevo e inténtalo otra vez.');
        } else if (detail === 'Usuario no encontrado') {
          this.verificationError.set('No encontramos una cuenta con ese correo. Verifica que esté bien escrito.');
        } else {
          this.verificationError.set('No se pudo verificar la cuenta. Inténtalo más tarde.');
        }

        console.error('Error al verificar correo:', err);
      },
    });
  }

  onResendVerification(): void {
    const correoActual = this.verificationEmail() || this.loginForm.get('correo')?.value;

    if (!correoActual) {
      this.triggerToast('Ingresa tu correo electrónico para reenviar el código.');
      return;
    }

    this.verificationEmail.set(correoActual);
    this.isResending.set(true);
    this.verificationError.set(null);
    this.verificationMessage.set(null);

    this.http.post<any>(`${this.apiUrl}/auth/resend-code`, { correo: correoActual }, { withCredentials: true }).subscribe({
      next: (respuesta) => {
        this.isResending.set(false);
        this.verificationMessage.set(respuesta?.message || 'Código reenviado. Revisa tu correo.');
        this.showVerificationBox.set(true);
      },
      error: (err) => {
        this.isResending.set(false);
        const detail = this.getErrorDetail(err);

        if (detail === 'Usuario no encontrado') {
          this.verificationError.set('El usuario no se encontró. Verifica que el correo esté bien escrito.');
        } else if (detail === 'La cuenta ya está verificada') {
          this.verificationMessage.set('Esta cuenta ya está verificada. Ya puedes iniciar sesión.');
        } else {
          this.verificationError.set('No se pudo reenviar el código. Inténtalo de nuevo más tarde.');
        }

        this.showVerificationBox.set(true);
        console.error('Error en reenvío de verificación:', err);
      },
    });
  }

  private getErrorDetail(err: any): string {
    const detail = err?.error?.detail ?? err?.detail ?? err?.error?.message ?? err?.message;

    if (typeof detail === 'string') return detail;
    if (detail?.message) return detail.message;

    try {
      return JSON.stringify(detail);
    } catch {
      return 'Error desconocido';
    }
  }
}
