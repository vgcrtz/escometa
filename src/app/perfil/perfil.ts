import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../services/auth';
import { ImagenService } from '../services/imagen.service';
import { variables_globales } from '../variables-globales';

type UserRole = 'ALUMNO' | 'DOCENTE' | 'ADMINISTRATIVO' | 'ADMIN' | 'INVITADO';
type AdminPanelMode = 'idle' | 'view' | 'create' | 'edit';

interface ApiResponse<T = any> {
  status?: string;
  message?: string;
  authenticated?: boolean;
  data?: T;
  detail?: any;
}

interface DetailRow {
  label: string;
  value: string;
  type?: 'badge' | 'muted' | 'status';
}

interface SubjectRow {
  id_grupo_materia?: number;
  grupo?: string;
  materia?: string;
  docente?: string;
  estado?: string;
}

@Component({
  selector: 'app-perfil',
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private authService = inject(Auth);
  private storageService = inject(ImagenService);
  private location = inject(Location);
  private http = inject(HttpClient);

  private apiUrl = variables_globales.server_url.replace(/\/$/, '');
  private httpOptions = { withCredentials: true };

  public userData = signal<any>(null);
  public userSubjects = signal<SubjectRow[]>([]);

  public isLoading = signal<boolean>(true);
  public isUploading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public editMode = signal<boolean>(false);

  public adminPanelOpen = signal<boolean>(false);
  public adminMode = signal<AdminPanelMode>('idle');
  public adminUsers = signal<any[]>([]);
  public selectedAdminUser = signal<any>(null);
  public selectedAdminSubjects = signal<SubjectRow[]>([]);
  public isAdminLoading = signal<boolean>(false);
  public isAdminSaving = signal<boolean>(false);
  public userSearch = signal<string>('');

  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');
  public adminErrorMessage = signal<string>('');
  public adminSuccessMessage = signal<string>('');

  public defaultAvatar = 'user.png';

  public editForm: any = {};
  public adminForm: any = this.createEmptyUserForm();

  public isAdmin = computed(() => this.userData()?.tipo_usuario === 'ADMIN');
  public canEditOwnData = computed(() => this.isAdmin());

  public profileDetails = computed<DetailRow[]>(() => this.buildUserDetails(this.userData(), false));

  public filteredAdminUsers = computed(() => {
    const text = this.userSearch().trim().toLowerCase();
    const users = this.adminUsers();

    if (!text) return users;

    return users.filter((user) => {
      const haystack = [
        user?.nombre,
        user?.nombre_usuario,
        user?.correo,
        user?.tipo_usuario,
        user?.id_usuario?.toString(),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(text);
    });
  });

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  cargarDatosDeUsuario(): void {
    this.loadCurrentUser();
  }

  loadCurrentUser(showSpinner = true): void {
    if (showSpinner) this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.obtener_datos_usuario().subscribe({
      next: (response: ApiResponse<any>) => {
        const sessionUser = response?.data || response;

        if (!sessionUser?.id_usuario) {
          this.userData.set(sessionUser);
          this.userSubjects.set([]);
          this.isLoading.set(false);
          return;
        }

        this.http
          .get<ApiResponse<any>>(`${this.apiUrl}/usuarios/${sessionUser.id_usuario}`, this.httpOptions)
          .subscribe({
            next: (detailResponse) => {
              const fullUser = detailResponse?.data || sessionUser;
              this.userData.set(fullUser);
              this.loadSubjectsForCurrentUser(fullUser);
              this.isLoading.set(false);
            },
            error: () => {
              this.userData.set(sessionUser);
              this.loadSubjectsForCurrentUser(sessionUser);
              this.isLoading.set(false);
            },
          });
      },
      error: (err) => {
        console.error('Error al recuperar credenciales:', err);
        this.errorMessage.set(this.extractError(err, 'No se pudo cargar la información del perfil.'));
        this.isLoading.set(false);
      },
    });
  }

  onAvatarClick(fileInput: HTMLInputElement): void {
    if (!this.editMode() || this.isUploading()) return;
    fileInput.click();
  }

  async onFotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Selecciona un archivo de imagen válido.');
      input.value = '';
      return;
    }

    this.isUploading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const nickname = (this.userData()?.nombre_usuario || 'default').replace(/\s+/g, '_');
      const extension = file.name.split('.').pop() || 'png';
      const fileName = `avatar_${nickname}_${Date.now()}.${extension}`;

      const publicUrl = await this.storageService.subirImagen(file, 'imagenes', fileName);

      this.authService.subir_foto_perfil(publicUrl).subscribe({
        next: () => {
          this.userData.update((current) => ({
            ...current,
            foto_perfil_url: publicUrl,
          }));
          this.successMessage.set('Foto de perfil actualizada.');
          this.isUploading.set(false);
          input.value = '';
        },
        error: (err) => {
          console.error('Error al registrar URL en la BD de ESCOMETA:', err);
          this.errorMessage.set(this.extractError(err, 'La imagen se subió, pero no se pudo guardar en tu perfil.'));
          this.isUploading.set(false);
          input.value = '';
        },
      });
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      this.errorMessage.set('No se pudo subir la imagen. Inténtalo de nuevo.');
      this.isUploading.set(false);
      input.value = '';
    }
  }

  startProfileEdit(): void {
    this.editForm = this.mapUserToForm(this.userData());
    this.editMode.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  cancelProfileEdit(): void {
    this.editMode.set(false);
    this.editForm = {};
    this.errorMessage.set('');
  }

  finishPhotoEdit(): void {
    this.editMode.set(false);
    this.successMessage.set('Edición finalizada.');
  }

  saveOwnProfile(): void {
    const currentUser = this.userData();

    if (!currentUser?.id_usuario || !this.canEditOwnData()) {
      this.finishPhotoEdit();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = this.buildOwnProfilePayload();

    this.http
      .put<ApiResponse<any>>(`${this.apiUrl}/usuarios/${currentUser.id_usuario}`, payload, this.httpOptions)
      .subscribe({
        next: () => {
          this.successMessage.set('Perfil actualizado correctamente.');
          this.editMode.set(false);
          this.isSaving.set(false);
          this.loadCurrentUser(false);
        },
        error: (err) => {
          this.errorMessage.set(this.extractError(err, 'No se pudo actualizar el perfil.'));
          this.isSaving.set(false);
        },
      });
  }

  openUsersPanel(): void {
    if (!this.isAdmin()) return;

    this.adminPanelOpen.set(true);
    this.adminMode.set('idle');
    this.selectedAdminUser.set(null);
    this.selectedAdminSubjects.set([]);
    this.adminErrorMessage.set('');
    this.adminSuccessMessage.set('');
    this.loadAdminUsers();
  }

  closeUsersPanel(): void {
    this.adminPanelOpen.set(false);
    this.adminMode.set('idle');
    this.selectedAdminUser.set(null);
    this.selectedAdminSubjects.set([]);
    this.adminErrorMessage.set('');
    this.adminSuccessMessage.set('');
  }

  loadAdminUsers(): void {
    this.isAdminLoading.set(true);
    this.adminErrorMessage.set('');

    this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/usuarios`, this.httpOptions).subscribe({
      next: (response) => {
        this.adminUsers.set(response?.data || []);
        this.isAdminLoading.set(false);
      },
      error: (err) => {
        this.adminErrorMessage.set(this.extractError(err, 'No se pudo cargar la lista de usuarios.'));
        this.isAdminLoading.set(false);
      },
    });
  }

  prepareCreateUser(): void {
    this.adminMode.set('create');
    this.selectedAdminUser.set(null);
    this.selectedAdminSubjects.set([]);
    this.adminForm = this.createEmptyUserForm();
    this.adminErrorMessage.set('');
    this.adminSuccessMessage.set('');
  }

  viewAdminUser(user: any): void {
    if (!user?.id_usuario) return;
    this.loadAdminUserDetails(user.id_usuario, 'view');
  }

  prepareEditUser(user: any): void {
    if (!user?.id_usuario) return;
    this.loadAdminUserDetails(user.id_usuario, 'edit');
  }

  loadAdminUserDetails(idUsuario: number, mode: AdminPanelMode): void {
    this.isAdminLoading.set(true);
    this.adminErrorMessage.set('');
    this.adminSuccessMessage.set('');

    this.http.get<ApiResponse<any>>(`${this.apiUrl}/usuarios/${idUsuario}`, this.httpOptions).subscribe({
      next: (response) => {
        const user = response?.data || null;
        this.selectedAdminUser.set(user);
        this.adminMode.set(mode);
        this.adminForm = this.mapUserToForm(user);
        this.loadSubjectsForAdminUser(user);
        this.isAdminLoading.set(false);
      },
      error: (err) => {
        this.adminErrorMessage.set(this.extractError(err, 'No se pudo cargar el usuario.'));
        this.isAdminLoading.set(false);
      },
    });
  }

  saveAdminUser(): void {
    const mode = this.adminMode();
    const isCreate = mode === 'create';
    const selectedUser = this.selectedAdminUser();

    if (!isCreate && !selectedUser?.id_usuario) return;

    const payload = this.buildAdminUserPayload(isCreate);

    if (isCreate && !payload['contraseña']) {
      this.adminErrorMessage.set('La contraseña es obligatoria para crear usuarios.');
      return;
    }

    this.isAdminSaving.set(true);
    this.adminErrorMessage.set('');
    this.adminSuccessMessage.set('');

    const request = isCreate
      ? this.http.post<ApiResponse<any>>(`${this.apiUrl}/usuarios`, payload, this.httpOptions)
      : this.http.put<ApiResponse<any>>(`${this.apiUrl}/usuarios/${selectedUser.id_usuario}`, payload, this.httpOptions);

    request.subscribe({
      next: (response) => {
        const savedId = response?.data?.id_usuario || selectedUser?.id_usuario;
        this.adminSuccessMessage.set(isCreate ? 'Usuario creado correctamente.' : 'Usuario actualizado correctamente.');
        this.isAdminSaving.set(false);
        this.loadAdminUsers();

        if (savedId) {
          this.loadAdminUserDetails(savedId, 'view');
        } else {
          this.adminMode.set('idle');
        }

        if (savedId === this.userData()?.id_usuario) {
          this.loadCurrentUser(false);
        }
      },
      error: (err) => {
        this.adminErrorMessage.set(this.extractError(err, 'No se pudo guardar el usuario.'));
        this.isAdminSaving.set(false);
      },
    });
  }

  deleteAdminUser(user: any, force = false): void {
    if (!user?.id_usuario) return;

    const actionText = force ? 'eliminar definitivamente' : 'desactivar';
    const confirmation = window.confirm(`¿Seguro que deseas ${actionText} a ${user.nombre || user.correo}?`);
    if (!confirmation) return;

    this.isAdminLoading.set(true);
    this.adminErrorMessage.set('');
    this.adminSuccessMessage.set('');

    this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/usuarios/${user.id_usuario}?force=${force}`, this.httpOptions)
      .subscribe({
        next: (response) => {
          this.adminSuccessMessage.set(response?.message || (force ? 'Usuario eliminado.' : 'Usuario desactivado.'));
          this.isAdminLoading.set(false);
          this.loadAdminUsers();

          if (this.selectedAdminUser()?.id_usuario === user.id_usuario) {
            this.selectedAdminUser.set(null);
            this.selectedAdminSubjects.set([]);
            this.adminMode.set('idle');
          }
        },
        error: (err) => {
          this.adminErrorMessage.set(this.extractError(err, 'No se pudo modificar el estado del usuario.'));
          this.isAdminLoading.set(false);
        },
      });
  }

  buildUserDetails(user: any, includeName = true): DetailRow[] {
    if (!user) return [];

    const rows: DetailRow[] = [];

    this.pushRow(rows, 'ID de usuario', user.id_usuario);

    if (includeName) {
      this.pushRow(rows, 'Nombre completo', user.nombre);
      this.pushRow(rows, 'Nombre de usuario', user.nombre_usuario ? `@${user.nombre_usuario}` : '');
    }

    this.pushRow(rows, 'Correo institucional', user.correo);
    this.pushRow(rows, 'Rol', user.tipo_usuario, 'badge');

    if (user.activo !== undefined && user.activo !== null) {
      this.pushRow(rows, 'Estado', user.activo ? 'Activo' : 'Inactivo', 'status');
    }

    if (user.verificado !== undefined && user.verificado !== null) {
      this.pushRow(rows, 'Verificación', user.verificado ? 'Cuenta verificada' : 'Pendiente de verificación', 'status');
    }

    this.pushRow(rows, 'Fecha de registro', this.formatDate(user.fecha_registro));

    const role = user.tipo_usuario as UserRole;
    if (role === 'ALUMNO') {
      this.pushRow(rows, 'Boleta', this.readRoleValue(user, 'boleta'));
      this.pushRow(rows, 'Carrera', this.readRoleValue(user, 'carrera'));
      this.pushRow(rows, 'Semestre', this.readRoleValue(user, 'semestre'));
    }

    if (role === 'DOCENTE') {
      this.pushRow(rows, 'Grado académico', this.readRoleValue(user, 'grado_academico'));
      this.pushRow(rows, 'Departamento', this.readRoleValue(user, 'departamento'));
    }

    if (role === 'ADMINISTRATIVO') {
      this.pushRow(rows, 'Área', this.readRoleValue(user, 'area'));
      this.pushRow(rows, 'Puesto', this.readRoleValue(user, 'puesto'));
    }

    return rows;
  }

  getAdminUserDetails(user: any): DetailRow[] {
    return this.buildUserDetails(user, true);
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      ALUMNO: 'Alumno',
      DOCENTE: 'Docente',
      ADMINISTRATIVO: 'Administrativo',
      ADMIN: 'Administrador',
      INVITADO: 'Invitado',
    };

    return labels[role] || role || 'Sin rol';
  }

  trackByUserId(index: number, user: any): number {
    return user?.id_usuario || index;
  }

  regresar(): void {
    this.location.back();
  }

  private loadSubjectsForCurrentUser(user: any): void {
    if (user?.tipo_usuario !== 'ALUMNO') {
      this.userSubjects.set([]);
      return;
    }

    this.http.get<ApiResponse<SubjectRow[]>>(`${this.apiUrl}/alumnos/me/materias`, this.httpOptions).subscribe({
      next: (response) => this.userSubjects.set(response?.data || []),
      error: () => this.userSubjects.set([]),
    });
  }

  private loadSubjectsForAdminUser(user: any): void {
    if (user?.tipo_usuario !== 'ALUMNO' || !user?.id_usuario) {
      this.selectedAdminSubjects.set([]);
      return;
    }

    this.http
      .get<ApiResponse<SubjectRow[]>>(`${this.apiUrl}/alumnos/${user.id_usuario}/materias`, this.httpOptions)
      .subscribe({
        next: (response) => this.selectedAdminSubjects.set(response?.data || []),
        error: () => this.selectedAdminSubjects.set([]),
      });
  }

  private buildOwnProfilePayload(): any {
    const payload: any = {
      nombre: this.safeText(this.editForm.nombre),
      nombre_usuario: this.safeText(this.editForm.nombre_usuario),
      correo: this.safeText(this.editForm.correo),
    };

    this.addRoleFields(payload, this.userData()?.tipo_usuario, this.editForm);
    return this.removeEmptyFields(payload);
  }

  private buildAdminUserPayload(isCreate: boolean): any {
    const form = this.adminForm;
    const payload: any = {
      correo: this.safeText(form.correo),
      nombre: this.safeText(form.nombre),
      nombre_usuario: this.safeText(form.nombre_usuario),
      tipo_usuario: form.tipo_usuario,
      activo: !!form.activo,
      verificado: !!form.verificado,
    };

    if (isCreate || this.safeText(form.password)) {
      payload['contraseña'] = this.safeText(form.password);
    }

    this.addRoleFields(payload, form.tipo_usuario, form);
    return this.removeEmptyFields(payload);
  }

  private addRoleFields(payload: any, role: UserRole, form: any): void {
    if (role === 'ALUMNO') {
      payload.boleta = this.safeText(form.boleta);
      payload.carrera = this.safeText(form.carrera);
      payload.semestre = form.semestre !== undefined && form.semestre !== null && form.semestre !== '' ? Number(form.semestre) : undefined;
    }

    if (role === 'DOCENTE') {
      payload.grado_academico = this.safeText(form.grado_academico);
      payload.departamento = this.safeText(form.departamento);
    }

    if (role === 'ADMINISTRATIVO') {
      payload.area = this.safeText(form.area);
      payload.puesto = this.safeText(form.puesto);
    }
  }

  private createEmptyUserForm(): any {
    return {
      correo: '',
      nombre: '',
      nombre_usuario: '',
      password: '',
      tipo_usuario: 'ALUMNO',
      activo: true,
      verificado: true,
      boleta: '',
      carrera: '',
      semestre: '',
      grado_academico: '',
      departamento: '',
      area: '',
      puesto: '',
    };
  }

  private mapUserToForm(user: any): any {
    if (!user) return this.createEmptyUserForm();

    return {
      id_usuario: user.id_usuario,
      correo: user.correo || '',
      nombre: user.nombre || '',
      nombre_usuario: user.nombre_usuario || '',
      password: '',
      tipo_usuario: user.tipo_usuario || 'ALUMNO',
      activo: user.activo !== false,
      verificado: !!user.verificado,
      boleta: this.readRoleValue(user, 'boleta') || '',
      carrera: this.readRoleValue(user, 'carrera') || '',
      semestre: this.readRoleValue(user, 'semestre') || '',
      grado_academico: this.readRoleValue(user, 'grado_academico') || '',
      departamento: this.readRoleValue(user, 'departamento') || '',
      area: this.readRoleValue(user, 'area') || '',
      puesto: this.readRoleValue(user, 'puesto') || '',
    };
  }

  private readRoleValue(user: any, field: string): any {
    if (!user) return '';
    const roleKey = this.roleProfileKey(user.tipo_usuario);
    return user?.[field] ?? user?.[roleKey]?.[field] ?? '';
  }

  private roleProfileKey(role: UserRole): string {
    const keys: Record<string, string> = {
      ALUMNO: 'alumno',
      DOCENTE: 'docente',
      ADMINISTRATIVO: 'administrativo',
      ADMIN: 'admin',
    };

    return keys[role] || '';
  }

  private pushRow(rows: DetailRow[], label: string, value: any, type?: DetailRow['type']): void {
    if (value === undefined || value === null || value === '') return;
    rows.push({ label, value: String(value), type });
  }

  private safeText(value: any): string {
    return typeof value === 'string' ? value.trim() : value ?? '';
  }

  private removeEmptyFields(payload: any): any {
    const clean: any = {};

    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value !== undefined && value !== null && value !== '') {
        clean[key] = value;
      }
    });

    return clean;
  }

  private formatDate(value: any): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private extractError(err: any, fallback: string): string {
    const detail = err?.error?.detail || err?.error?.message || err?.message;

    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (detail?.message) return detail.message;

    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }
}
