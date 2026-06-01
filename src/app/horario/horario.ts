import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs';
import { variables_globales } from '../variables-globales';

interface ApiResponse<T> {
  status?: string;
  message?: string;
  authenticated?: boolean;
  data?: T;
  detail?: string | Record<string, unknown>;
}

interface UsuarioActual {
  id_usuario: number;
  nombre?: string;
  nombre_usuario?: string;
  correo?: string;
  tipo_usuario?: string;
}

interface Usuario extends UsuarioActual {
  activo?: boolean;
  verificado?: boolean;
  grado_academico?: string;
  departamento?: string;
}

interface OpcionCarrera {
  codigo: string;
  nombre: string;
}

interface OpcionTurno {
  codigo: string;
  nombre: string;
  etiqueta: string;
}

interface Materia {
  id_materia: number;
  nombre: string;
}

interface GrupoAcademico {
  id_grupo: number;
  clave: string;
  carrera?: string;
  semestre?: number | string | null;
  turno?: string;
}

interface GrupoMateria {
  id_grupo_materia: number;
  id_grupo: number;
  id_materia?: number;
  id_docente?: number;
  grupo: string;
  materia: string;
  docente?: string;
  cupo?: number | null;
  semestre?: number | null;
}

interface MateriaAlumno {
  id_grupo_materia: number;
  grupo: string;
  materia: string;
  docente?: string;
  estado?: string;
}

interface SesionClase {
  id_sesion?: number;
  id_grupo_materia?: number;
  dia?: string;
  hora_inicio?: string;
  hora_fin?: string;
  aula?: string;
}

interface HorarioFila {
  id_fila: string;
  id_sesion?: number;
  id_grupo_materia: number;
  grupo: string;
  materia: string;
  docente?: string;
  estado?: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string;
}

type AdminTab = 'materias' | 'grupos' | 'oferta' | 'inscripciones' | 'sesiones';

@Component({
  selector: 'app-horario',
  imports: [CommonModule, FormsModule],
  templateUrl: './horario.html',
  styleUrl: './horario.css',
})
export class Horario implements OnInit {
  private http = inject(HttpClient);
  private api = variables_globales.server_url.replace(/\/$/, '');
  private httpOptions = { withCredentials: true };

  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);
  public editMode = signal<boolean>(false);
  public mostrarFormularioAgregar = signal<boolean>(false);
  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');
  public isAdmin = signal<boolean>(false);
  public activeAdminTab = signal<AdminTab>('materias');

  public horario = signal<HorarioFila[]>([]);
  public materiasAlumno = signal<MateriaAlumno[]>([]);
  public materias = signal<Materia[]>([]);
  public grupos = signal<GrupoAcademico[]>([]);
  public gruposMateria = signal<GrupoMateria[]>([]);
  public usuarios = signal<Usuario[]>([]);
  public alumnos = signal<Usuario[]>([]);
  public docentes = signal<Usuario[]>([]);
  public alumnosInscritos = signal<Usuario[]>([]);
  public sesiones = signal<SesionClase[]>([]);
  public sesionesGrupoMateria = signal<SesionClase[]>([]);
  public semestres = signal<number[]>([]);
  public gruposFiltrados = signal<GrupoAcademico[]>([]);
  public materiasFiltradas = signal<GrupoMateria[]>([]);

  public semestreSeleccionado = '';
  public grupoSeleccionado = '';
  public grupoMateriaSeleccionado = '';

  public materiaForm: { id_materia: number | null; nombre: string } = {
    id_materia: null,
    nombre: '',
  };

  public grupoForm: {
    id_grupo: number | null;
    clave: string;
    carrera: string;
    semestre: string;
    turno: string;
  } = {
    id_grupo: null,
    clave: '',
    carrera: '',
    semestre: '',
    turno: '',
  };

  public grupoMateriaForm: {
    id_grupo_materia: number | null;
    id_grupo: string;
    id_materia: string;
    id_docente: string;
    cupo: string;
  } = {
    id_grupo_materia: null,
    id_grupo: '',
    id_materia: '',
    id_docente: '',
    cupo: '',
  };

  public inscripcionGrupoMateriaSeleccionado = '';
  public alumnoSeleccionado = '';

  public sesionGrupoMateriaSeleccionado = '';
  public sesionForm: {
    id_sesion: number | null;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    aula: string;
  } = {
    id_sesion: null,
    dia: 'LUNES',
    hora_inicio: '07:00',
    hora_fin: '08:30',
    aula: '',
  };

  public diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  public carreras: OpcionCarrera[] = [
    { codigo: 'A', nombre: 'Licenciatura en Ciencia de Datos' },
    { codigo: 'B', nombre: 'Ingeniería en Inteligencia Artificial' },
    { codigo: 'C', nombre: 'Ingeniería en Sistemas Computacionales' },
  ];
  public turnos: OpcionTurno[] = [
    { codigo: 'M', nombre: 'MATUTINO', etiqueta: 'Matutino' },
    { codigo: 'V', nombre: 'VESPERTINO', etiqueta: 'Vespertino' },
  ];

  private usuarioActual: UsuarioActual | null = null;

  ngOnInit(): void {
    this.cargarSesionYDatos();
  }

  cargarSesionYDatos(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.http.get<ApiResponse<UsuarioActual>>(`${this.api}/auth/me`, this.httpOptions).subscribe({
      next: (respuestaSesion) => {
        const usuario = this.extraerData<UsuarioActual | null>(respuestaSesion, null);

        if (!usuario?.id_usuario) {
          this.isLoading.set(false);
          this.errorMessage.set('No se pudo identificar al usuario autenticado. Inicia sesión nuevamente.');
          return;
        }

        this.usuarioActual = usuario;
        this.isAdmin.set(usuario.tipo_usuario === 'ADMIN');

        if (this.isAdmin()) {
          this.cargarDatosAdmin();
        } else {
          this.cargarDatosAcademicosAlumno();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudo validar la sesión del usuario.'));
      },
    });
  }

  recargarDatos(): void {
    if (this.isAdmin()) {
      this.cargarDatosAdmin(false);
    } else {
      this.cargarDatosAcademicosAlumno();
    }
  }

  private cargarDatosAcademicosAlumno(): void {
    this.isLoading.set(true);

    forkJoin({
      materiasAlumno: this.http.get<ApiResponse<MateriaAlumno[]>>(`${this.api}/alumnos/me/materias`, this.httpOptions),
      grupos: this.http.get<ApiResponse<GrupoAcademico[]>>(`${this.api}/grupos`, this.httpOptions),
      gruposMateria: this.http.get<ApiResponse<GrupoMateria[]>>(`${this.api}/grupos-materia`, this.httpOptions),
    }).subscribe({
      next: ({ materiasAlumno, grupos, gruposMateria }) => {
        const materiasInscritas = this.extraerArreglo(materiasAlumno).map((materia) => this.normalizarMateriaAlumno(materia));
        const oferta = this.extraerArreglo(gruposMateria).map((materiaGrupo) => this.normalizarGrupoMateria(materiaGrupo));
        const gruposNormalizados = this.normalizarGrupos(this.extraerArreglo(grupos), oferta);

        this.materiasAlumno.set(materiasInscritas.filter((materia) => materia.id_grupo_materia > 0));
        this.gruposMateria.set(oferta.filter((materiaGrupo) => materiaGrupo.id_grupo_materia > 0));
        this.grupos.set(gruposNormalizados.filter((grupo) => grupo.id_grupo > 0));
        this.actualizarSemestres();
        this.cargarSesionesDeMaterias(this.materiasAlumno());
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudo cargar la información académica del alumno.'));
      },
    });
  }

  private cargarDatosAdmin(mostrarLoader = true): void {
    if (mostrarLoader) this.isLoading.set(true);

    forkJoin({
      usuarios: this.http.get<ApiResponse<Usuario[]>>(`${this.api}/usuarios`, this.httpOptions),
      materias: this.http.get<ApiResponse<Materia[]>>(`${this.api}/materias`, this.httpOptions),
      grupos: this.http.get<ApiResponse<GrupoAcademico[]>>(`${this.api}/grupos`, this.httpOptions),
      gruposMateria: this.http.get<ApiResponse<GrupoMateria[]>>(`${this.api}/grupos-materia`, this.httpOptions),
      sesiones: this.http.get<ApiResponse<SesionClase[]>>(`${this.api}/sesiones`, this.httpOptions).pipe(catchError(() => of({ data: [] as SesionClase[] }))),
    }).subscribe({
      next: ({ usuarios, materias, grupos, gruposMateria, sesiones }) => {
        const usuariosNormalizados = this.extraerArreglo(usuarios).map((usuario) => this.normalizarUsuario(usuario));
        const materiasNormalizadas = this.extraerArreglo(materias).map((materia) => this.normalizarMateria(materia));
        const ofertaBase = this.extraerArreglo(gruposMateria).map((materiaGrupo) => this.normalizarGrupoMateria(materiaGrupo));
        const gruposNormalizados = this.normalizarGrupos(this.extraerArreglo(grupos), ofertaBase);

        this.usuarios.set(usuariosNormalizados.filter((usuario) => usuario.id_usuario > 0));
        this.alumnos.set(this.usuarios().filter((usuario) => usuario.tipo_usuario === 'ALUMNO' && usuario.activo !== false));
        this.docentes.set(this.usuarios().filter((usuario) => usuario.tipo_usuario === 'DOCENTE' && usuario.activo !== false));
        this.materias.set(materiasNormalizadas.filter((materia) => materia.id_materia > 0));
        this.grupos.set(gruposNormalizados.filter((grupo) => grupo.id_grupo > 0));
        this.gruposMateria.set(this.enriquecerOfertas(ofertaBase.filter((oferta) => oferta.id_grupo_materia > 0)));
        this.sesiones.set(this.extraerArreglo(sesiones).map((sesion) => this.normalizarSesion(sesion)));
        this.actualizarSemestres();

        if (this.inscripcionGrupoMateriaSeleccionado) {
          this.cargarAlumnosInscritos(false);
        }

        if (this.sesionGrupoMateriaSeleccionado) {
          this.cargarSesionesGrupoMateria(false);
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudo cargar la información administrativa.'));
      },
    });
  }

  private cargarSesionesDeMaterias(materias: MateriaAlumno[]): void {
    if (materias.length === 0) {
      this.horario.set([]);
      this.isLoading.set(false);
      return;
    }

    const peticiones = materias.map((materia) =>
      this.http
        .get<ApiResponse<SesionClase[]>>(`${this.api}/sesiones/grupo-materia/${materia.id_grupo_materia}`, this.httpOptions)
        .pipe(catchError(() => of({ data: [] as SesionClase[] }))),
    );

    forkJoin(peticiones).subscribe({
      next: (respuestasSesiones) => {
        const filas = respuestasSesiones.flatMap((respuesta, index) => {
          const materia = materias[index];
          const sesiones = this.extraerArreglo<SesionClase>(respuesta);

          if (sesiones.length === 0) {
            return [this.crearFilaSinSesion(materia)];
          }

          return sesiones.map((sesion) => this.crearFilaHorario(materia, sesion));
        });

        this.horario.set(filas.sort((a, b) => this.compararFilasHorario(a, b)));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudieron cargar las sesiones del horario.'));
      },
    });
  }

  cambiarAdminTab(tab: AdminTab): void {
    this.activeAdminTab.set(tab);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  activarEdicion(): void {
    this.editMode.update((valor) => !valor);
    this.mostrarFormularioAgregar.set(false);
    this.limpiarFormularioAgregar();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  abrirFormularioAgregar(): void {
    this.mostrarFormularioAgregar.set(true);
    this.limpiarFormularioAgregar();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  cancelarFormularioAgregar(): void {
    this.mostrarFormularioAgregar.set(false);
    this.limpiarFormularioAgregar();
  }

  onSemestreChange(): void {
    this.grupoSeleccionado = '';
    this.grupoMateriaSeleccionado = '';
    const semestre = Number(this.semestreSeleccionado);

    this.gruposFiltrados.set(
      this.grupos()
        .filter((grupo) => this.obtenerSemestreGrupo(grupo) === semestre)
        .sort((a, b) => this.obtenerClaveGrupo(a).localeCompare(this.obtenerClaveGrupo(b))),
    );

    this.materiasFiltradas.set([]);
  }

  onGrupoChange(): void {
    this.grupoMateriaSeleccionado = '';
    const idGrupo = Number(this.grupoSeleccionado);
    const inscritas = new Set(this.materiasAlumno().map((materia) => Number(materia.id_grupo_materia)));

    this.materiasFiltradas.set(
      this.gruposMateria()
        .filter((materiaGrupo) => Number(materiaGrupo.id_grupo) === idGrupo)
        .filter((materiaGrupo) => !inscritas.has(Number(materiaGrupo.id_grupo_materia)))
        .sort((a, b) => a.materia.localeCompare(b.materia)),
    );
  }

  inscribirMateria(): void {
    if (!this.usuarioActual?.id_usuario) {
      this.errorMessage.set('No se pudo identificar al alumno autenticado.');
      return;
    }

    const idGrupoMateria = Number(this.grupoMateriaSeleccionado);

    if (!idGrupoMateria) {
      this.errorMessage.set('Selecciona semestre, grupo y materia antes de inscribir.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.http
      .post<ApiResponse<unknown>>(
        `${this.api}/grupos-materia/${idGrupoMateria}/inscribir`,
        { id_usuario: this.usuarioActual.id_usuario },
        this.httpOptions,
      )
      .subscribe({
        next: () => {
          this.successMessage.set('Materia agregada al horario correctamente.');
          this.mostrarFormularioAgregar.set(false);
          this.limpiarFormularioAgregar();
          this.isSaving.set(false);
          this.cargarDatosAcademicosAlumno();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudo inscribir la materia seleccionada.'));
        },
      });
  }

  eliminarMateria(materia: MateriaAlumno | HorarioFila): void {
    if (!this.usuarioActual?.id_usuario) {
      this.errorMessage.set('No se pudo identificar al alumno autenticado.');
      return;
    }

    const idGrupoMateria = Number(materia.id_grupo_materia);
    const nombreMateria = materia.materia || 'esta materia';

    if (!idGrupoMateria) return;

    const confirmar = window.confirm(`¿Deseas eliminar ${nombreMateria} de tu horario?`);
    if (!confirmar) return;

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.http
      .post<ApiResponse<unknown>>(
        `${this.api}/grupos-materia/${idGrupoMateria}/expulsar`,
        { id_usuario: this.usuarioActual.id_usuario },
        this.httpOptions,
      )
      .subscribe({
        next: () => {
          this.successMessage.set('Materia eliminada del horario correctamente.');
          this.isSaving.set(false);
          this.cargarDatosAcademicosAlumno();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudo eliminar la materia del horario.'));
        },
      });
  }

  guardarMateriaAdmin(): void {
    const nombre = this.materiaForm.nombre.trim();
    if (!nombre) {
      this.errorMessage.set('Escribe el nombre de la materia.');
      return;
    }

    const idMateria = this.materiaForm.id_materia;
    const peticion = idMateria
      ? this.http.put<ApiResponse<Materia>>(`${this.api}/materias/${idMateria}`, { nombre }, this.httpOptions)
      : this.http.post<ApiResponse<Materia>>(`${this.api}/materias`, { nombre }, this.httpOptions);

    this.ejecutarAccionAdmin(peticion, idMateria ? 'Materia actualizada correctamente.' : 'Materia creada correctamente.', () => {
      this.limpiarMateriaForm();
    });
  }

  editarMateriaAdmin(materia: Materia): void {
    this.materiaForm = { id_materia: materia.id_materia, nombre: materia.nombre };
  }

  limpiarMateriaForm(): void {
    this.materiaForm = { id_materia: null, nombre: '' };
  }

  eliminarMateriaAdmin(materia: Materia): void {
    const confirmar = window.confirm(`¿Deseas eliminar la materia ${materia.nombre}?`);
    if (!confirmar) return;

    this.ejecutarAccionAdmin(
      this.http.delete<ApiResponse<unknown>>(`${this.api}/materias/${materia.id_materia}`, this.httpOptions),
      'Materia eliminada correctamente.',
      () => this.limpiarMateriaForm(),
    );
  }

  onGrupoFormBaseChange(): void {
    this.grupoForm.clave = this.generarClaveGrupo();
  }

  guardarGrupoAdmin(): void {
    this.onGrupoFormBaseChange();

    if (!this.grupoForm.semestre || !this.grupoForm.carrera || !this.grupoForm.turno) {
      this.errorMessage.set('Selecciona semestre, carrera y turno para generar la clave del grupo.');
      return;
    }

    const clave = this.grupoForm.clave.trim();
    if (!clave) {
      this.errorMessage.set('No se pudo generar la clave del grupo. Verifica los datos seleccionados.');
      return;
    }

    const payload = {
      clave,
      carrera: this.obtenerNombreCarrera(this.grupoForm.carrera),
      semestre: Number(this.grupoForm.semestre),
      turno: this.obtenerNombreTurno(this.grupoForm.turno),
    };

    const idGrupo = this.grupoForm.id_grupo;
    const peticion = idGrupo
      ? this.http.put<ApiResponse<GrupoAcademico>>(`${this.api}/grupos/${idGrupo}`, payload, this.httpOptions)
      : this.http.post<ApiResponse<GrupoAcademico>>(`${this.api}/grupos`, payload, this.httpOptions);

    this.ejecutarAccionAdmin(peticion, idGrupo ? 'Grupo actualizado correctamente.' : `Grupo ${clave} creado correctamente.`, () => {
      this.limpiarGrupoForm();
    });
  }

  editarGrupoAdmin(grupo: GrupoAcademico): void {
    this.grupoForm = {
      id_grupo: grupo.id_grupo,
      clave: grupo.clave,
      carrera: this.obtenerNombreCarrera(grupo.carrera || ''),
      semestre: grupo.semestre !== null && grupo.semestre !== undefined ? String(grupo.semestre) : '',
      turno: this.obtenerNombreTurno(grupo.turno || ''),
    };
    this.onGrupoFormBaseChange();
  }

  limpiarGrupoForm(): void {
    this.grupoForm = { id_grupo: null, clave: '', carrera: '', semestre: '', turno: '' };
  }

  eliminarGrupoAdmin(grupo: GrupoAcademico): void {
    const confirmar = window.confirm(`¿Deseas eliminar el grupo ${this.obtenerClaveGrupo(grupo)}?`);
    if (!confirmar) return;

    this.ejecutarAccionAdmin(
      this.http.delete<ApiResponse<unknown>>(`${this.api}/grupos/${grupo.id_grupo}`, this.httpOptions),
      'Grupo eliminado correctamente.',
      () => this.limpiarGrupoForm(),
    );
  }

  guardarGrupoMateriaAdmin(): void {
    const idGrupo = Number(this.grupoMateriaForm.id_grupo);
    const idMateria = Number(this.grupoMateriaForm.id_materia);
    const idDocente = Number(this.grupoMateriaForm.id_docente);

    if (!idGrupo || !idMateria || !idDocente) {
      this.errorMessage.set('Selecciona grupo, materia y docente para ofertar la materia.');
      return;
    }

    const payload = {
      id_grupo: idGrupo,
      id_materia: idMateria,
      id_docente: idDocente,
      cupo: this.grupoMateriaForm.cupo ? Number(this.grupoMateriaForm.cupo) : undefined,
    };

    const idGrupoMateria = this.grupoMateriaForm.id_grupo_materia;
    const peticion = idGrupoMateria
      ? this.http.put<ApiResponse<GrupoMateria>>(`${this.api}/grupos-materia/${idGrupoMateria}`, payload, this.httpOptions)
      : this.http.post<ApiResponse<GrupoMateria>>(`${this.api}/grupos-materia`, payload, this.httpOptions);

    this.ejecutarAccionAdmin(
      peticion,
      idGrupoMateria ? 'Materia-grupo actualizada correctamente.' : 'Materia asignada al grupo correctamente.',
      () => this.limpiarGrupoMateriaForm(),
    );
  }

  editarGrupoMateriaAdmin(oferta: GrupoMateria): void {
    this.grupoMateriaForm = {
      id_grupo_materia: oferta.id_grupo_materia,
      id_grupo: oferta.id_grupo ? String(oferta.id_grupo) : '',
      id_materia: oferta.id_materia ? String(oferta.id_materia) : '',
      id_docente: oferta.id_docente ? String(oferta.id_docente) : '',
      cupo: oferta.cupo !== null && oferta.cupo !== undefined ? String(oferta.cupo) : '',
    };
  }

  limpiarGrupoMateriaForm(): void {
    this.grupoMateriaForm = { id_grupo_materia: null, id_grupo: '', id_materia: '', id_docente: '', cupo: '' };
  }

  eliminarGrupoMateriaAdmin(oferta: GrupoMateria): void {
    const confirmar = window.confirm(`¿Deseas eliminar la oferta ${this.obtenerTextoOferta(oferta)}?`);
    if (!confirmar) return;

    this.ejecutarAccionAdmin(
      this.http.delete<ApiResponse<unknown>>(`${this.api}/grupos-materia/${oferta.id_grupo_materia}`, this.httpOptions),
      'Materia-grupo eliminada correctamente.',
      () => this.limpiarGrupoMateriaForm(),
    );
  }

  onGrupoMateriaInscripcionChange(): void {
    this.alumnoSeleccionado = '';
    this.cargarAlumnosInscritos();
  }

  cargarAlumnosInscritos(mostrarMensajes = true): void {
    const idGrupoMateria = Number(this.inscripcionGrupoMateriaSeleccionado);
    this.alumnosInscritos.set([]);

    if (!idGrupoMateria) return;

    this.isSaving.set(true);
    if (mostrarMensajes) {
      this.errorMessage.set('');
      this.successMessage.set('');
    }

    this.http
      .get<ApiResponse<Usuario[]>>(`${this.api}/grupos-materia/${idGrupoMateria}/alumnos`, this.httpOptions)
      .pipe(catchError(() => of({ data: [] as Usuario[] })))
      .subscribe({
        next: (respuesta) => {
          this.alumnosInscritos.set(this.extraerArreglo(respuesta).map((usuario) => this.normalizarUsuario(usuario)));
          this.isSaving.set(false);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudieron cargar los alumnos inscritos.'));
        },
      });
  }

  alumnosDisponibles(): Usuario[] {
    const inscritos = new Set(this.alumnosInscritos().map((alumno) => Number(alumno.id_usuario)));
    return this.alumnos()
      .filter((alumno) => !inscritos.has(Number(alumno.id_usuario)))
      .sort((a, b) => this.obtenerNombreUsuario(a).localeCompare(this.obtenerNombreUsuario(b)));
  }

  inscribirAlumnoAdmin(): void {
    const idGrupoMateria = Number(this.inscripcionGrupoMateriaSeleccionado);
    const idUsuario = Number(this.alumnoSeleccionado);

    if (!idGrupoMateria || !idUsuario) {
      this.errorMessage.set('Selecciona una materia-grupo y un alumno.');
      return;
    }

    this.ejecutarAccionAdmin(
      this.http.post<ApiResponse<unknown>>(
        `${this.api}/grupos-materia/${idGrupoMateria}/inscribir`,
        { id_usuario: idUsuario },
        this.httpOptions,
      ),
      'Alumno inscrito correctamente.',
      () => {
        this.alumnoSeleccionado = '';
        this.cargarAlumnosInscritos(false);
      },
      false,
    );
  }

  expulsarAlumnoAdmin(alumno: Usuario): void {
    const idGrupoMateria = Number(this.inscripcionGrupoMateriaSeleccionado);
    if (!idGrupoMateria || !alumno.id_usuario) return;

    const confirmar = window.confirm(`¿Deseas remover a ${this.obtenerNombreUsuario(alumno)} de esta materia-grupo?`);
    if (!confirmar) return;

    this.ejecutarAccionAdmin(
      this.http.post<ApiResponse<unknown>>(
        `${this.api}/grupos-materia/${idGrupoMateria}/expulsar`,
        { id_usuario: alumno.id_usuario },
        this.httpOptions,
      ),
      'Alumno removido correctamente.',
      () => this.cargarAlumnosInscritos(false),
      false,
    );
  }

  onGrupoMateriaSesionChange(): void {
    this.limpiarSesionForm(false);
    this.cargarSesionesGrupoMateria();
  }

  cargarSesionesGrupoMateria(mostrarMensajes = true): void {
    const idGrupoMateria = Number(this.sesionGrupoMateriaSeleccionado);
    this.sesionesGrupoMateria.set([]);

    if (!idGrupoMateria) return;

    this.isSaving.set(true);
    if (mostrarMensajes) {
      this.errorMessage.set('');
      this.successMessage.set('');
    }

    this.http
      .get<ApiResponse<SesionClase[]>>(`${this.api}/sesiones/grupo-materia/${idGrupoMateria}`, this.httpOptions)
      .pipe(catchError(() => of({ data: [] as SesionClase[] })))
      .subscribe({
        next: (respuesta) => {
          this.sesionesGrupoMateria.set(
            this.extraerArreglo(respuesta)
              .map((sesion) => this.normalizarSesion(sesion))
              .sort((a, b) => this.compararSesiones(a, b)),
          );
          this.isSaving.set(false);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudieron cargar las sesiones de la materia-grupo.'));
        },
      });
  }

  guardarSesionAdmin(): void {
    const idGrupoMateria = Number(this.sesionGrupoMateriaSeleccionado);

    if (!idGrupoMateria) {
      this.errorMessage.set('Selecciona una materia-grupo para administrar sus sesiones.');
      return;
    }

    if (!this.sesionForm.dia || !this.sesionForm.hora_inicio || !this.sesionForm.hora_fin) {
      this.errorMessage.set('Completa día, hora de inicio y hora de fin.');
      return;
    }

    const payload = {
      id_grupo_materia: idGrupoMateria,
      dia: this.sesionForm.dia,
      hora_inicio: this.normalizarHoraBackend(this.sesionForm.hora_inicio),
      hora_fin: this.normalizarHoraBackend(this.sesionForm.hora_fin),
      aula: this.sesionForm.aula.trim() || undefined,
    };

    const idSesion = this.sesionForm.id_sesion;
    const peticion = idSesion
      ? this.http.put<ApiResponse<SesionClase>>(
          `${this.api}/sesiones/${idSesion}`,
          {
            dia: payload.dia,
            hora_inicio: payload.hora_inicio,
            hora_fin: payload.hora_fin,
            aula: payload.aula,
          },
          this.httpOptions,
        )
      : this.http.post<ApiResponse<SesionClase>>(`${this.api}/sesiones`, payload, this.httpOptions);

    this.ejecutarAccionAdmin(peticion, idSesion ? 'Sesión actualizada correctamente.' : 'Sesión creada correctamente.', () => {
      this.limpiarSesionForm(false);
      this.cargarSesionesGrupoMateria(false);
    });
  }

  editarSesionAdmin(sesion: SesionClase): void {
    this.sesionForm = {
      id_sesion: sesion.id_sesion ?? null,
      dia: sesion.dia || 'LUNES',
      hora_inicio: this.formatearHora(sesion.hora_inicio || ''),
      hora_fin: this.formatearHora(sesion.hora_fin || ''),
      aula: sesion.aula || '',
    };
  }

  limpiarSesionForm(conservarGrupo = true): void {
    this.sesionForm = { id_sesion: null, dia: 'LUNES', hora_inicio: '07:00', hora_fin: '08:30', aula: '' };
    if (!conservarGrupo) return;
    this.sesionGrupoMateriaSeleccionado = '';
    this.sesionesGrupoMateria.set([]);
  }

  eliminarSesionAdmin(sesion: SesionClase): void {
    if (!sesion.id_sesion) return;

    const confirmar = window.confirm('¿Deseas eliminar esta sesión de clase?');
    if (!confirmar) return;

    this.ejecutarAccionAdmin(
      this.http.delete<ApiResponse<unknown>>(`${this.api}/sesiones/${sesion.id_sesion}`, this.httpOptions),
      'Sesión eliminada correctamente.',
      () => this.cargarSesionesGrupoMateria(false),
      false,
    );
  }

  obtenerTextoMateria(materiaGrupo: GrupoMateria): string {
    const docente = materiaGrupo.docente ? ` · ${materiaGrupo.docente}` : '';
    const cupo = materiaGrupo.cupo !== null && materiaGrupo.cupo !== undefined ? ` · Cupo: ${materiaGrupo.cupo}` : '';
    return `${materiaGrupo.materia}${docente}${cupo}`;
  }

  obtenerTextoOferta(oferta: GrupoMateria): string {
    const docente = oferta.docente ? ` · ${oferta.docente}` : '';
    const cupo = oferta.cupo !== null && oferta.cupo !== undefined ? ` · Cupo: ${oferta.cupo}` : '';
    return `${oferta.grupo} · ${oferta.materia}${docente}${cupo}`;
  }

  obtenerClaveGrupo(grupo: GrupoAcademico): string {
    return grupo.clave || `Grupo ${grupo.id_grupo}`;
  }

  obtenerNombreUsuario(usuario: Usuario | UsuarioActual): string {
    return usuario.nombre || usuario.nombre_usuario || usuario.correo || `Usuario ${usuario.id_usuario}`;
  }

  obtenerCorreoUsuario(usuario: Usuario): string {
    return usuario.correo || 'Sin correo';
  }

  formatearHora(hora: string): string {
    if (!hora || hora === '-') return '-';
    return hora.slice(0, 5);
  }

  formatearRangoHorario(fila: HorarioFila): string {
    if (!fila.hora_inicio || fila.hora_inicio === '-') return 'Sin horario';
    return `${this.formatearHora(fila.hora_inicio)} - ${this.formatearHora(fila.hora_fin)}`;
  }

  formatearRangoSesion(sesion: SesionClase): string {
    if (!sesion.hora_inicio || !sesion.hora_fin) return 'Sin horario';
    return `${this.formatearHora(sesion.hora_inicio)} - ${this.formatearHora(sesion.hora_fin)}`;
  }

  private ejecutarAccionAdmin(peticion: any, mensajeExito: string, despues?: () => void, recargar = true): void {
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    peticion.subscribe({
      next: () => {
        this.successMessage.set(mensajeExito);
        if (despues) despues();
        this.isSaving.set(false);
        if (recargar) this.cargarDatosAdmin(false);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.errorMessage.set(this.obtenerMensajeError(err, 'No se pudo completar la operación.'));
      },
    });
  }

  private limpiarFormularioAgregar(): void {
    this.semestreSeleccionado = '';
    this.grupoSeleccionado = '';
    this.grupoMateriaSeleccionado = '';
    this.gruposFiltrados.set([]);
    this.materiasFiltradas.set([]);
  }

  private actualizarSemestres(): void {
    const semestres = this.grupos()
      .map((grupo) => this.obtenerSemestreGrupo(grupo))
      .filter((semestre): semestre is number => semestre !== null && !Number.isNaN(semestre));

    this.semestres.set([...new Set<number>(semestres)].sort((a: number, b: number) => a - b));
  }

  private normalizarUsuario(raw: any): Usuario {
    return {
      id_usuario: Number(raw?.id_usuario ?? raw?.id ?? 0),
      nombre: this.obtenerTexto(raw?.nombre, ''),
      nombre_usuario: this.obtenerTexto(raw?.nombre_usuario ?? raw?.username, ''),
      correo: this.obtenerTexto(raw?.correo ?? raw?.email, ''),
      tipo_usuario: this.obtenerTexto(raw?.tipo_usuario ?? raw?.rol, '').toUpperCase(),
      activo: raw?.activo,
      verificado: raw?.verificado,
      grado_academico: this.obtenerTexto(raw?.grado_academico ?? raw?.docente?.grado_academico, ''),
      departamento: this.obtenerTexto(raw?.departamento ?? raw?.docente?.departamento, ''),
    };
  }

  private normalizarMateria(raw: any): Materia {
    return {
      id_materia: Number(raw?.id_materia ?? raw?.id ?? 0),
      nombre: this.obtenerTexto(raw?.nombre ?? raw?.materia, 'Sin materia'),
    };
  }

  private normalizarMateriaAlumno(raw: any): MateriaAlumno {
    return {
      id_grupo_materia: Number(raw?.id_grupo_materia ?? raw?.grupo_materia?.id_grupo_materia ?? raw?.id ?? 0),
      grupo: this.obtenerTexto(raw?.grupo ?? raw?.grupo_academico ?? raw?.clave_grupo ?? raw?.clave, 'Sin grupo'),
      materia: this.obtenerTexto(raw?.materia ?? raw?.nombre_materia ?? raw?.nombre, 'Sin materia'),
      docente: this.obtenerTexto(raw?.docente ?? raw?.nombre_docente, ''),
      estado: raw?.estado ?? 'INSCRITO',
    };
  }

  private normalizarGrupoMateria(raw: any): GrupoMateria {
    const grupoRaw = raw?.grupo ?? raw?.grupo_academico;
    const materiaRaw = raw?.materia;
    const docenteRaw = raw?.docente;
    const idGrupo = Number(raw?.id_grupo ?? grupoRaw?.id_grupo ?? 0);
    const grupo = this.obtenerTexto(grupoRaw ?? raw?.clave_grupo ?? raw?.clave, idGrupo ? `Grupo ${idGrupo}` : 'Sin grupo');
    const semestre = this.obtenerNumero(raw?.semestre ?? grupoRaw?.semestre) ?? this.inferirSemestreDesdeClave(grupo);

    return {
      id_grupo_materia: Number(raw?.id_grupo_materia ?? raw?.id ?? 0),
      id_grupo: idGrupo,
      id_materia: this.obtenerNumero(raw?.id_materia ?? materiaRaw?.id_materia) ?? undefined,
      id_docente: this.obtenerNumero(raw?.id_docente ?? docenteRaw?.id_usuario ?? docenteRaw?.id) ?? undefined,
      grupo,
      materia: this.obtenerTexto(materiaRaw ?? raw?.nombre_materia ?? raw?.nombre, 'Sin materia'),
      docente: this.obtenerTexto(docenteRaw ?? raw?.nombre_docente, ''),
      cupo: this.obtenerNumero(raw?.cupo),
      semestre,
    };
  }

  private normalizarSesion(raw: any): SesionClase {
    return {
      id_sesion: this.obtenerNumero(raw?.id_sesion ?? raw?.id) ?? undefined,
      id_grupo_materia: this.obtenerNumero(raw?.id_grupo_materia ?? raw?.grupo_materia?.id_grupo_materia) ?? undefined,
      dia: this.obtenerTexto(raw?.dia, 'SIN DÍA'),
      hora_inicio: this.obtenerTexto(raw?.hora_inicio, ''),
      hora_fin: this.obtenerTexto(raw?.hora_fin, ''),
      aula: this.obtenerTexto(raw?.aula, 'Sin aula'),
    };
  }

  private normalizarGrupos(rawGrupos: any[], oferta: GrupoMateria[]): GrupoAcademico[] {
    const gruposDesdeEndpoint = rawGrupos.map((raw) => {
      const clave = this.obtenerTexto(raw?.clave ?? raw?.grupo ?? raw?.nombre, `Grupo ${raw?.id_grupo ?? raw?.id ?? ''}`);
      const semestre = this.obtenerNumero(raw?.semestre) ?? this.inferirSemestreDesdeClave(clave);

      return {
        id_grupo: Number(raw?.id_grupo ?? raw?.id ?? 0),
        clave,
        carrera: this.obtenerNombreCarrera(raw?.carrera),
        semestre,
        turno: this.obtenerNombreTurno(raw?.turno),
      };
    });

    if (gruposDesdeEndpoint.length > 0) {
      return gruposDesdeEndpoint;
    }

    const gruposMap = new Map<number, GrupoAcademico>();
    oferta.forEach((materiaGrupo) => {
      if (!gruposMap.has(materiaGrupo.id_grupo)) {
        gruposMap.set(materiaGrupo.id_grupo, {
          id_grupo: materiaGrupo.id_grupo,
          clave: materiaGrupo.grupo,
          semestre: materiaGrupo.semestre ?? this.inferirSemestreDesdeClave(materiaGrupo.grupo),
        });
      }
    });

    return [...gruposMap.values()];
  }

  private enriquecerOfertas(ofertas: GrupoMateria[]): GrupoMateria[] {
    return ofertas
      .map((oferta) => {
        const grupo = this.grupos().find((item) => Number(item.id_grupo) === Number(oferta.id_grupo));
        const materia = this.materias().find((item) => Number(item.id_materia) === Number(oferta.id_materia));
        const docente = this.docentes().find((item) => Number(item.id_usuario) === Number(oferta.id_docente));

        return {
          ...oferta,
          grupo: grupo ? this.obtenerClaveGrupo(grupo) : oferta.grupo,
          materia: materia ? materia.nombre : oferta.materia,
          docente: docente ? this.obtenerNombreUsuario(docente) : oferta.docente,
          semestre: grupo ? this.obtenerSemestreGrupo(grupo) : oferta.semestre,
        };
      })
      .sort((a, b) => this.obtenerTextoOferta(a).localeCompare(this.obtenerTextoOferta(b)));
  }

  private crearFilaHorario(materia: MateriaAlumno, sesion: SesionClase): HorarioFila {
    const idSesion = sesion.id_sesion ?? 0;

    return {
      id_fila: `${materia.id_grupo_materia}-${idSesion}-${sesion.dia ?? 'SIN_DIA'}-${sesion.hora_inicio ?? 'SIN_HORA'}`,
      id_sesion: sesion.id_sesion,
      id_grupo_materia: materia.id_grupo_materia,
      grupo: materia.grupo,
      materia: materia.materia,
      docente: materia.docente,
      estado: materia.estado,
      dia: sesion.dia ?? 'SIN DÍA',
      hora_inicio: sesion.hora_inicio ?? '-',
      hora_fin: sesion.hora_fin ?? '-',
      aula: sesion.aula || 'Sin aula',
    };
  }

  private crearFilaSinSesion(materia: MateriaAlumno): HorarioFila {
    return {
      id_fila: `${materia.id_grupo_materia}-sin-sesion`,
      id_grupo_materia: materia.id_grupo_materia,
      grupo: materia.grupo,
      materia: materia.materia,
      docente: materia.docente,
      estado: materia.estado,
      dia: 'SIN SESIONES',
      hora_inicio: '-',
      hora_fin: '-',
      aula: 'Pendiente',
    };
  }

  private compararFilasHorario(a: HorarioFila, b: HorarioFila): number {
    const ordenDias = ['LUNES', 'MARTES', 'MIERCOLES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'SÁBADO', 'DOMINGO'];
    const diaA = ordenDias.indexOf(a.dia.toUpperCase());
    const diaB = ordenDias.indexOf(b.dia.toUpperCase());
    const ordenDiaA = diaA === -1 ? 99 : diaA;
    const ordenDiaB = diaB === -1 ? 99 : diaB;

    if (ordenDiaA !== ordenDiaB) return ordenDiaA - ordenDiaB;
    return a.hora_inicio.localeCompare(b.hora_inicio);
  }

  private compararSesiones(a: SesionClase, b: SesionClase): number {
    const filaA = this.crearFilaHorario({ id_grupo_materia: 0, grupo: '', materia: '' }, a);
    const filaB = this.crearFilaHorario({ id_grupo_materia: 0, grupo: '', materia: '' }, b);
    return this.compararFilasHorario(filaA, filaB);
  }

  obtenerNombreCarrera(valor: string | undefined | null): string {
    const texto = String(valor || '').trim();
    if (!texto) return '';

    const porCodigo = this.carreras.find((carrera) => carrera.codigo === texto.toUpperCase());
    if (porCodigo) return porCodigo.nombre;

    const porNombre = this.carreras.find((carrera) => carrera.nombre.toLowerCase() === texto.toLowerCase());
    return porNombre ? porNombre.nombre : texto;
  }

  obtenerNombreTurno(valor: string | undefined | null): string {
    const texto = String(valor || '').trim();
    if (!texto) return '';

    const porCodigo = this.turnos.find((turno) => turno.codigo === texto.toUpperCase());
    if (porCodigo) return porCodigo.nombre;

    const porNombre = this.turnos.find((turno) => turno.nombre.toLowerCase() === texto.toLowerCase());
    return porNombre ? porNombre.nombre : texto.toUpperCase();
  }

  obtenerCodigoCarrera(valor: string | undefined | null): string {
    const nombre = this.obtenerNombreCarrera(valor);
    return this.carreras.find((carrera) => carrera.nombre === nombre)?.codigo || '';
  }

  obtenerCodigoTurno(valor: string | undefined | null): string {
    const nombre = this.obtenerNombreTurno(valor);
    return this.turnos.find((turno) => turno.nombre === nombre)?.codigo || '';
  }

  private generarClaveGrupo(): string {
    const semestre = Number(this.grupoForm.semestre);
    const codigoCarrera = this.obtenerCodigoCarrera(this.grupoForm.carrera);
    const codigoTurno = this.obtenerCodigoTurno(this.grupoForm.turno);

    if (!semestre || !codigoCarrera || !codigoTurno) return '';

    const prefijo = `${semestre}${codigoCarrera}${codigoTurno}`.toUpperCase();
    const patron = new RegExp(`^${prefijo}(\\d+)$`, 'i');

    const numerosUsados = this.grupos()
      .filter((grupo) => Number(grupo.id_grupo) !== Number(this.grupoForm.id_grupo || 0))
      .map((grupo) => String(grupo.clave || '').trim().toUpperCase())
      .map((clave) => clave.match(patron)?.[1])
      .filter((numero): numero is string => Boolean(numero))
      .map((numero) => Number(numero))
      .filter((numero) => Number.isInteger(numero) && numero > 0);

    const siguiente = numerosUsados.length > 0 ? Math.max(...numerosUsados) + 1 : 1;
    return `${prefijo}${siguiente}`;
  }

  private obtenerSemestreGrupo(grupo: GrupoAcademico): number | null {
    return this.obtenerNumero(grupo.semestre) ?? this.inferirSemestreDesdeClave(grupo.clave);
  }

  private inferirSemestreDesdeClave(clave: string): number | null {
    const match = String(clave || '').match(/^(\d+)/);
    return match ? Number(match[1]) : null;
  }

  private normalizarHoraBackend(hora: string): string {
    if (!hora) return '';
    return hora.length === 5 ? `${hora}:00` : hora;
  }

  private obtenerTexto(valor: any, fallback: string): string {
    if (valor === null || valor === undefined || valor === '') return fallback;
    if (typeof valor === 'string' || typeof valor === 'number') return String(valor);

    return (
      valor.nombre ??
      valor.clave ??
      valor.nombre_usuario ??
      valor.correo ??
      valor.descripcion ??
      fallback
    );
  }

  private obtenerNumero(valor: any): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const numero = Number(valor);
    return Number.isNaN(numero) ? null : numero;
  }

  private extraerData<T>(respuesta: any, fallback: T): T {
    return (respuesta?.data ?? respuesta ?? fallback) as T;
  }

  private extraerArreglo<T = any>(respuesta: any): T[] {
    const data = this.extraerData<any>(respuesta, []);
    return Array.isArray(data) ? data : [];
  }

  private obtenerMensajeError(err: any, fallback: string): string {
    const detail = err?.error?.detail ?? err?.error?.message ?? err?.message;

    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && 'message' in detail) return String((detail as any).message);

    return JSON.stringify(detail);
  }
}
