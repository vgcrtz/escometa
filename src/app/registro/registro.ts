import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { Auth } from '../services/auth';
import { variables_globales } from '../variables-globales';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro implements OnInit {
  private authService = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);
  private apiUrl = variables_globales.server_url.replace(/\/$/, '');

  public verificationCode = new FormControl('', [Validators.required, Validators.minLength(4)]);
  public showVerificationBox = signal<boolean>(false);
  public verificationEmail = signal<string>('');
  public verificationMessage = signal<string | null>(null);
  public verificationError = signal<string | null>(null);
  public registerError = signal<string | null>(null);
  public isRegistering = signal<boolean>(false);
  public isVerifying = signal<boolean>(false);
  public isResending = signal<boolean>(false);

  departamentos: string[] = [
    'Departamento de Formación Básica',
    'Departamento de Ciencias e Ingeniería de la Computación',
    'Departamento de Ingeniería en Sistemas Computacionales',
    'Departamento de Formación Integral e Institucional',
    'Departamento de Evaluación y Seguimiento Académico',
    'Departamento de Innovación Educativa',
    'Unidad de Tecnología Educativa y Campus Virtual',
  ];

  areasAdministrativas: { [key: string]: string[] } = {
    Dirección: [
      'Director(a)',
      'Decano',
      'Coordinador(a) de Enlace y Gestión Técnica',
      'Secretaria(o)',
      'Auxiliar Administrativo',
    ],
    'Subdirección Académica': [
      'Subdirector(a) Académico(a)',
      'Jefe(a) de Departamento',
      'Coordinador(a)',
      'Secretaria(o)',
      'Auxiliar Administrativo',
    ],
    'Subdirección de Servicios Educativos e Integración Social': [
      'Subdirector(a) de Servicios Educativos',
      'Jefe(a) de Departamento',
      'Secretaria(o)',
      'Auxiliar Administrativo',
    ],
    'Subdirección Administrativa': [
      'Subdirector(a) Administrativo(a)',
      'Jefe(a) de Departamento (Capital Humano, Recursos, etc.)',
      'Secretaria(o)',
      'Auxiliar Administrativo',
    ],
    'Sección de Estudios de Posgrado e Investigación': [
      'Jefe(a) de la Sección',
      'Coordinador(a) de Posgrado',
      'Secretaria(o)',
      'Auxiliar Administrativo',
    ],
  };

  areasDisponibles: string[] = Object.keys(this.areasAdministrativas);
  puestosDisponibles: string[] = [];

  registerForm = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    contrasena: new FormControl('', [Validators.required, Validators.minLength(10)]),
    nombre: new FormControl('', [Validators.required, Validators.minLength(2)]),
    nombre_usuario: new FormControl('', [Validators.required, Validators.minLength(2)]),
    tipo_usuario: new FormControl('', [Validators.required]),

    boleta: new FormControl(''),
    carrera: new FormControl(''),
    semestre: new FormControl(''),
    grado_academico: new FormControl(''),
    departamento: new FormControl(''),

    area: new FormControl(''),
    puesto: new FormControl({ value: '', disabled: true }),
  });

  ngOnInit() {
    this.registerForm.get('tipo_usuario')?.valueChanges.subscribe((tipo) => {
      this.actualizarCamposDinamicos(tipo);
    });

    this.registerForm.get('area')?.valueChanges.subscribe((areaSeleccionada) => {
      if (areaSeleccionada && this.areasAdministrativas[areaSeleccionada]) {
        this.puestosDisponibles = this.areasAdministrativas[areaSeleccionada];
        this.registerForm.get('puesto')?.enable();
      } else {
        this.puestosDisponibles = [];
        this.registerForm.get('puesto')?.disable();
      }
      this.registerForm.get('puesto')?.setValue('');
    });
  }

  actualizarCamposDinamicos(tipo: string | null) {
    const camposDinamicos = [
      'boleta',
      'carrera',
      'semestre',
      'grado_academico',
      'departamento',
      'area',
      'puesto',
    ];

    camposDinamicos.forEach((campo) => {
      this.registerForm.get(campo)?.clearValidators();
      this.registerForm.get(campo)?.setValue('');
      if (campo === 'puesto') {
        this.registerForm.get(campo)?.disable();
      }
      this.registerForm.get(campo)?.updateValueAndValidity();
    });

    if (tipo === 'ALUMNO') {
      this.registerForm.get('boleta')?.setValidators([Validators.required]);
      this.registerForm.get('carrera')?.setValidators([Validators.required]);
      this.registerForm.get('semestre')?.setValidators([Validators.required, Validators.min(1)]);
    } else if (tipo === 'DOCENTE') {
      this.registerForm.get('grado_academico')?.setValidators([Validators.required]);
      this.registerForm.get('departamento')?.setValidators([Validators.required]);
    } else if (tipo === 'ADMINISTRATIVO') {
      this.registerForm.get('area')?.setValidators([Validators.required]);
      this.registerForm.get('puesto')?.setValidators([Validators.required]);
    }

    camposDinamicos.forEach((campo) => {
      this.registerForm.get(campo)?.updateValueAndValidity();
    });
  }

  registrarUsuario() {
    if (this.registerForm.invalid || this.isRegistering()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.registerError.set(null);
    this.hideVerificationBox(false);
    this.isRegistering.set(true);

    this.authService.enviarRegistroPost(this.registerForm.getRawValue()).subscribe({
      next: (respuesta) => {
        this.isRegistering.set(false);
        const correo = respuesta?.data?.correo || this.registerForm.get('correo')?.value || '';

        this.openVerificationBox(
          correo,
          respuesta?.message || 'Usuario registrado correctamente. Ingresa el código enviado a tu correo para activar tu cuenta.',
        );
      },
      error: (error) => {
        this.isRegistering.set(false);
        const detail = this.getErrorDetail(error);

        if (detail === 'El correo ya está registrado') {
          const correo = this.registerForm.get('correo')?.value || '';
          this.registerError.set('Este correo ya está registrado. Si aún no verificaste tu cuenta, ingresa el código o solicita uno nuevo.');
          this.openVerificationBox(correo, 'Puedes verificar esta cuenta con el código enviado a tu correo.');
        } else if (detail === 'El nombre de usuario ya está registrado') {
          this.registerError.set('El nombre de usuario ya está registrado. Intenta con otro.');
        } else if (detail === 'Dominio de correo no permitido') {
          this.registerError.set('El dominio de correo no está permitido. Usa un correo institucional válido.');
        } else if (detail === 'No puedes registrarte como administrador') {
          this.registerError.set('No puedes registrarte como administrador desde este formulario.');
        } else {
          this.registerError.set('No se pudo crear la cuenta. Revisa tus datos e inténtalo de nuevo.');
        }

        console.error('Error al registrar usuario', error);
      },
    });
  }

  openVerificationBox(correo: string, message?: string): void {
    if (!correo) {
      this.registerError.set('Ingresa un correo electrónico válido para verificar la cuenta.');
      return;
    }

    this.verificationEmail.set(correo);
    this.verificationCode.reset('');
    this.verificationError.set(null);
    this.verificationMessage.set(message || 'Ingresa el código que se envió a tu correo.');
    this.showVerificationBox.set(true);
  }

  hideVerificationBox(clearMessages = true): void {
    this.showVerificationBox.set(false);
    this.verificationEmail.set('');
    this.verificationCode.reset('');
    this.isVerifying.set(false);
    this.isResending.set(false);

    if (clearMessages) {
      this.verificationMessage.set(null);
      this.verificationError.set(null);
    }
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

        setTimeout(() => {
          this.router.navigate(['/iniciar-sesion']);
        }, 1800);
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
    const correoActual = this.verificationEmail() || this.registerForm.get('correo')?.value;

    if (!correoActual) {
      this.registerError.set('Ingresa un correo electrónico para reenviar el código.');
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
