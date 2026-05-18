import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormGroup, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Auth } from '../services/auth';

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

  departamentos: string[] = [
    'Departamento de Formación Básica',
    'Departamento de Ciencias e Ingeniería de la Computación',
    'Departamento de Ingeniería en Sistemas Computacionales',
    'Departamento de Formación Integral e Institucional',
    'Departamento de Evaluación y Seguimiento Académico',
    'Departamento de Innovación Educativa',
    'Unidad de Tecnología Educativa y Campus Virtual',
  ];

  // Estructura jerárquica basada en el organigrama
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
    contrasena: new FormControl('', [Validators.required, Validators.minLength(8)]),
    nombre: new FormControl('', [Validators.required, Validators.minLength(2)]),
    nombre_usuario: new FormControl('', [Validators.required, Validators.minLength(2)]),
    tipo_usuario: new FormControl('', [Validators.required]),

    boleta: new FormControl(''),
    carrera: new FormControl(''),
    semestre: new FormControl(''),
    grado_academico: new FormControl(''),
    departamento: new FormControl(''),

    // El puesto inicia deshabilitado para forzar la selección de área primero
    area: new FormControl(''),
    puesto: new FormControl({ value: '', disabled: true }),
  });

  ngOnInit() {
    // 1. Escuchar el cambio general de "Tipo de usuario"
    this.registerForm.get('tipo_usuario')?.valueChanges.subscribe((tipo) => {
      this.actualizarCamposDinamicos(tipo);
    });

    // 2. Escuchar el cambio en el "Área" para llenar los "Puestos" dinámicamente
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
    console.log('Datos a enviar:', this.registerForm.getRawValue());

    this.authService.enviarRegistroPost(this.registerForm.getRawValue()).subscribe({
      next: (respuesta) => {
        console.log('Registro exitoso', respuesta);
        this.router.navigate(['/iniciar-sesion']);
      },
      error: (error) => {
        console.error('Error al registrar usuario', error);
      },
    });
  }
}
