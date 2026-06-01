import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { forkJoin } from "rxjs";
import { Auth } from "../services/auth";
import { ImagenService } from "../services/imagen.service";
import { variables_globales } from "../variables-globales";

type ApiResponse<T> = {
  status?: string;
  message?: string;
  data?: T;
  authenticated?: boolean;
};

type NewsImage = {
  url: string;
  nombre_original?: string | null;
};

type NewsTarget = {
  id_target?: number | string | null;
  tipo_usuario?: string | null;
  carrera?: string | null;
  semestre?: number | string | null;
  id_grupo?: number | string | null;
  grupo?: string | null;
  id_grupo_materia?: number | string | null;
};

type HomeNewsItem = {
  id_anuncio?: number | string | null;
  titulo?: string | null;
  contenido?: string | null;
  fecha?: string | null;
  categoria?: string | null;
  prioridad?: string | null;
  fijado?: boolean | number | string | null;
  activo?: boolean | number | string | null;
  visible_desde?: string | null;
  visible_hasta?: string | null;
  tipo_usuario?: string | null;
  carrera?: string | null;
  semestre?: number | string | null;
  id_grupo?: number | string | null;
  id_grupo_materia?: number | string | null;
  id_emisor?: number | string | null;
  emisor?: string | null;
  imagenes?: NewsImage[] | string | null;
  imagen?: NewsImage | string | null;
  imagen_url?: string | null;
  url_imagen?: string | null;
  image_url?: string | null;
  targets?: NewsTarget[] | string | null;
  target?: NewsTarget | null;
  destinatarios?: Array<number | string> | string | null;
  etiquetas?: string[] | string | null;
  grupo?: string | null;
  [key: string]: any;
};

type AnnouncementForm = {
  titulo: string;
  contenido: string;
  categoria: string;
  prioridad: string;
  fijado: boolean;
  activo: boolean;
  visible_desde: string;
  visible_hasta: string;
  destinatarios: string;
  target_tipo_usuario: string;
  target_carrera: string;
  target_semestre: string;
  target_id_grupo: string;
  target_id_grupo_materia: string;
  image_url: string;
  image_name: string;
};

@Component({
  selector: "app-inicio",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./inicio.html",
  styleUrl: "./inicio.css",
})
export class Inicio implements OnInit {
  private authService = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);
  private imageService = inject(ImagenService);

  private apiBase = variables_globales.server_url.replace(/\/$/, "");

  public isLoggedIn = this.authService.isLoggedIn;
  public userRol = this.authService.userRol;

  public importantNews = signal<HomeNewsItem[]>([]);
  public newsLoading = signal<boolean>(false);
  public newsError = signal<string>("");
  public currentUser = signal<any>(null);
  public selectedNotice = signal<HomeNewsItem | null>(null);
  public editingNotice = signal<HomeNewsItem | null>(null);

  public showCreateModal = signal<boolean>(false);
  public posting = signal<boolean>(false);
  public postError = signal<string>("");
  public postSuccess = signal<string>("");
  public deletingId = signal<number | null>(null);
  public noticePendingDeletion = signal<HomeNewsItem | null>(null);
  public showDeleteConfirm = signal<boolean>(false);
  public deleteError = signal<string>("");
  public isImageUploading = signal<boolean>(false);
  public uploadedImageName = signal<string>("");

  public categories = [
    { value: "GENERAL", label: "General" },
    { value: "ACADEMICA", label: "Académica" },
    { value: "TRAMITES", label: "Trámites" },
    { value: "EVENTO", label: "Evento" },
    { value: "EMERGENCIA", label: "Emergencia" },
    { value: "SISTEMA", label: "Sistema" },
  ];

  public priorities = [
    { value: "NORMAL", label: "Normal" },
    { value: "ALTA", label: "Alta" },
    { value: "URGENTE", label: "Urgente" },
  ];

  public targetRoles = [
    { value: "", label: "Todos los roles" },
    { value: "ALUMNO", label: "Alumnos" },
    { value: "DOCENTE", label: "Docentes" },
    { value: "ADMINISTRATIVO", label: "Administrativos" },
    { value: "ADMIN", label: "Administradores" },
  ];

  public careers = [
    { value: "", label: "Todas las carreras" },
    {
      value: "Licenciatura en Ciencia de Datos",
      label: "Licenciatura en Ciencia de Datos",
    },
    {
      value: "Ingeniería en Inteligencia Artificial",
      label: "Ingeniería en Inteligencia Artificial",
    },
    {
      value: "Ingeniería en Sistemas Computacionales",
      label: "Ingeniería en Sistemas Computacionales",
    },
  ];

  public createForm = signal<AnnouncementForm>(this.getDefaultForm());

  public userRolTexto = computed(() => {
    if (!this.isLoggedIn()) {
      return "INVITADO";
    }

    const role = this.userRol();
    if (role === "DOCENTE" || role === "PROFESOR") return "PROFESOR";
    if (role === "ADMIN" || role === "ADMINISTRATIVO") return "ADMINISTRADOR";
    if (role === "ALUMNO") return "ALUMNO";
    return "INVITADO";
  });

  public canPost = computed(() => {
    const role = this.getCurrentRole();
    return role === "ADMIN" || role === "DOCENTE" || role === "ADMINISTRATIVO";
  });

  public isEditingAnnouncement = computed(() => this.editingNotice() !== null);

  private allOptions = [
    {
      titulo: "Horario",
      icono: "calendar.png",
      colorClase: "bg-dark-blue",
      link: "/horario",
      rolesPermitidos: ["ALUMNO", "DOCENTE", "ADMIN", "ADMINISTRATIVO"],
    },
    {
      titulo: "Asistente",
      icono: "chat.png",
      colorClase: "bg-medium-blue",
      link: "/chatbot",
      rolesPermitidos: [
        "INVITADO",
        "ALUMNO",
        "DOCENTE",
        "ADMIN",
        "ADMINISTRATIVO",
      ],
    },
    {
      titulo: "Investigar",
      icono: "loupe.png",
      colorClase: "bg-medium-blue",
      link: "/busqueda",
      rolesPermitidos: ["ALUMNO", "DOCENTE", "ADMIN", "ADMINISTRATIVO"],
    },
    {
      titulo: "Foro",
      icono: "people.png",
      colorClase: "bg-light-blue",
      link: "/foro",
      rolesPermitidos: [
        "INVITADO",
        "ALUMNO",
        "DOCENTE",
        "ADMIN",
        "ADMINISTRATIVO",
      ],
    },
    {
      titulo: "Mensajes",
      icono: "chat.png",
      colorClase: "bg-very-light-blue",
      link: "/mensajeria",
      rolesPermitidos: ["ALUMNO", "DOCENTE", "ADMIN", "ADMINISTRATIVO"],
    },
    {
      titulo: "Asistencia",
      icono: "check.png",
      colorClase: "bg-asistencia-blue",
      link: "/asistencia",
      rolesPermitidos: ["DOCENTE"],
    },
  ];

  public opcionesFiltradas = computed(() => {
    if (!this.isLoggedIn()) {
      return this.allOptions.filter((option) => option.link === "/foro");
    }

    const currentRole = this.userRol() || "INVITADO";
    return this.allOptions.filter((option) =>
      option.rolesPermitidos.includes(currentRole),
    );
  });

  ngOnInit(): void {
    this.loadCurrentUserAndNews();
  }

  public loadImportantNews(): void {
    if (!this.isLoggedIn()) {
      this.importantNews.set([]);
      this.newsLoading.set(false);
      return;
    }

    this.newsLoading.set(true);
    this.newsError.set("");

    const endpoint = this.getAnnouncementListEndpoint();

    if (this.isAdminUser()) {
      this.http
        .get<ApiResponse<HomeNewsItem[]>>(`${this.apiBase}${endpoint}`, {
          withCredentials: true,
        })
        .subscribe({
          next: (response) => {
            const data = this.getResponseData<HomeNewsItem[]>(response, []);
            this.importantNews.set(this.normalizeNewsList(data));
            this.newsLoading.set(false);
          },
          error: (error) => this.handleNewsLoadError(error),
        });
      return;
    }

    if (this.canPost()) {
      forkJoin({
        relevant: this.http.get<ApiResponse<HomeNewsItem[]>>(
          `${this.apiBase}/anuncios/noticias-importantes`,
          { withCredentials: true },
        ),
        own: this.http.get<ApiResponse<HomeNewsItem[]>>(
          `${this.apiBase}/anuncios/mis-anuncios`,
          { withCredentials: true },
        ),
      }).subscribe({
        next: ({ relevant, own }) => {
          const relevantData = this.getResponseData<HomeNewsItem[]>(
            relevant,
            [],
          );
          const ownData = this.getResponseData<HomeNewsItem[]>(own, []);
          this.importantNews.set(
            this.normalizeNewsList(this.mergeNewsLists(relevantData, ownData)),
          );
          this.newsLoading.set(false);
        },
        error: (error) => this.handleNewsLoadError(error),
      });
      return;
    }

    this.http
      .get<ApiResponse<HomeNewsItem[]>>(`${this.apiBase}${endpoint}`, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          const data = this.getResponseData<HomeNewsItem[]>(response, []);
          this.importantNews.set(this.normalizeNewsList(data));
          this.newsLoading.set(false);
        },
        error: (error) => this.handleNewsLoadError(error),
      });
  }

  public loadCurrentUser(): void {
    if (!this.isLoggedIn()) {
      this.currentUser.set(null);
      return;
    }

    this.http
      .get<
        ApiResponse<any>
      >(`${this.apiBase}/auth/me`, { withCredentials: true })
      .subscribe({
        next: (response) => this.currentUser.set(response?.data || null),
        error: () => this.currentUser.set(null),
      });
  }

  private loadCurrentUserAndNews(): void {
    if (!this.isLoggedIn()) {
      this.currentUser.set(null);
      this.importantNews.set([]);
      return;
    }

    this.http
      .get<
        ApiResponse<any>
      >(`${this.apiBase}/auth/me`, { withCredentials: true })
      .subscribe({
        next: (response) => {
          this.currentUser.set(response?.data || null);
          this.loadImportantNews();
        },
        error: () => {
          this.currentUser.set(null);
          this.loadImportantNews();
        },
      });
  }

  public openCreateModal(): void {
    if (!this.canPost()) return;

    this.editingNotice.set(null);
    this.createForm.set(this.getDefaultForm());
    this.uploadedImageName.set("");
    this.postError.set("");
    this.postSuccess.set("");
    this.showCreateModal.set(true);
  }

  public openEditModal(notice?: HomeNewsItem | null): void {
    if (!notice || !this.canEditNotice(notice)) return;

    const noticeId = this.getNoticeId(notice);
    if (noticeId === null) {
      this.prepareEditModal(notice);
      return;
    }

    this.http
      .get<ApiResponse<HomeNewsItem>>(`${this.apiBase}/anuncios/${noticeId}`, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          const fullNotice = this.getResponseData<HomeNewsItem>(
            response,
            notice,
          );
          this.prepareEditModal(this.mergeNoticeForEdit(notice, fullNotice));
        },
        error: () => this.prepareEditModal(notice),
      });
  }

  public closeCreateModal(): void {
    if (this.posting() || this.isImageUploading()) return;

    this.showCreateModal.set(false);
    this.editingNotice.set(null);
    this.postError.set("");
    this.postSuccess.set("");
  }

  private prepareEditModal(notice: HomeNewsItem): void {
    this.editingNotice.set(notice);
    this.createForm.set(this.buildFormFromNotice(notice));
    this.uploadedImageName.set(
      this.getNoticeImages(notice)[0]?.nombre_original || "",
    );
    this.selectedNotice.set(null);
    this.postError.set("");
    this.postSuccess.set("");
    this.showCreateModal.set(true);
  }

  private mergeNoticeForEdit(
    original: HomeNewsItem,
    fullNotice?: HomeNewsItem | null,
  ): HomeNewsItem {
    const merged = { ...original, ...(fullNotice || {}) };

    return {
      ...merged,
      imagenes: fullNotice?.imagenes ?? original.imagenes ?? merged.imagenes,
      targets: fullNotice?.targets ?? original.targets ?? merged.targets,
      destinatarios:
        fullNotice?.destinatarios ??
        original.destinatarios ??
        merged.destinatarios,
      etiquetas: fullNotice?.etiquetas ?? original.etiquetas ?? merged.etiquetas,
    };
  }


  public updateTextField(key: keyof AnnouncementForm, event: Event): void {
    const target = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    this.createForm.update((current) => ({ ...current, [key]: target.value }));
  }

  public updateBooleanField(key: keyof AnnouncementForm, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.createForm.update((current) => ({
      ...current,
      [key]: target.checked,
    }));
  }

  public async onNewsImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith("image/")) {
      this.postError.set("Selecciona un archivo de imagen válido.");
      input.value = "";
      return;
    }

    this.isImageUploading.set(true);
    this.postError.set("");
    this.postSuccess.set("");

    try {
      const fileName = this.buildStorageFileName(file);
      const publicUrl = await this.imageService.subirImagen(
        file,
        "imagenes",
        fileName,
      );

      this.createForm.update((current) => ({
        ...current,
        image_url: publicUrl,
        image_name: file.name,
      }));
      this.uploadedImageName.set(file.name);
    } catch (error) {
      console.error("Error al subir imagen de noticia:", error);
      this.postError.set(
        "No se pudo subir la imagen. Intenta de nuevo o pega una URL.",
      );
    } finally {
      this.isImageUploading.set(false);
      input.value = "";
    }
  }

  public clearSelectedImage(): void {
    if (this.isImageUploading() || this.posting()) return;

    this.createForm.update((current) => ({
      ...current,
      image_url: "",
      image_name: "",
    }));
    this.uploadedImageName.set("");
  }

  public createAnnouncement(event?: Event): void {
    event?.preventDefault();

    if (!this.canPost() || this.posting()) return;

    if (this.isImageUploading()) {
      this.postError.set(
        "Espera a que termine de subirse la imagen antes de publicar.",
      );
      return;
    }

    const payload = this.buildAnnouncementPayload();
    if (!payload) return;

    const editingId = this.getNoticeId(this.editingNotice());
    const request$ = editingId
      ? this.http.put<ApiResponse<HomeNewsItem>>(
          `${this.apiBase}/anuncios/${editingId}`,
          payload,
          { withCredentials: true },
        )
      : this.http.post<ApiResponse<HomeNewsItem>>(
          `${this.apiBase}/anuncios`,
          payload,
          { withCredentials: true },
        );

    this.posting.set(true);
    this.postError.set("");
    this.postSuccess.set("");

    request$.subscribe({
      next: () => {
        this.posting.set(false);
        this.postSuccess.set(
          editingId
            ? "Noticia actualizada correctamente."
            : "Noticia publicada correctamente.",
        );
        this.createForm.set(this.getDefaultForm());
        this.editingNotice.set(null);
        this.uploadedImageName.set("");
        this.loadImportantNews();
        window.setTimeout(() => this.showCreateModal.set(false), 550);
      },
      error: (error) => {
        this.posting.set(false);
        this.postError.set(
          this.extractErrorMessage(
            error,
            editingId
              ? "No se pudo actualizar la noticia."
              : "No se pudo publicar la noticia.",
          ),
        );
      },
    });
  }

  public canEditNotice(notice?: HomeNewsItem | null): boolean {
    return this.canManageNotice(notice);
  }

  public canDeleteNotice(notice?: HomeNewsItem | null): boolean {
    return this.canManageNotice(notice);
  }

  public openNoticeDetail(notice?: HomeNewsItem | null): void {
    if (!notice) return;
    this.selectedNotice.set(notice);
  }

  public closeNoticeDetail(): void {
    this.selectedNotice.set(null);
  }

  public isDeletingNotice(notice?: HomeNewsItem | null): boolean {
    const id = this.getNoticeId(notice);
    return id !== null && this.deletingId() === id;
  }

  public isFormBusy(): boolean {
    return this.posting() || this.isImageUploading();
  }

  public getEditingNoticeIdText(): string {
    const id = this.getNoticeId(this.editingNotice());
    return id === null ? "No disponible" : String(id);
  }

  public getEditingNoticeEmitterText(): string {
    const notice = this.editingNotice();
    if (!notice) return "No disponible";

    return String(
      notice.emisor ||
        (notice.id_emisor ? `Usuario #${notice.id_emisor}` : "No disponible"),
    );
  }

  public getEditingNoticeDateText(): string {
    return this.formatDate(this.editingNotice()?.fecha) || "No disponible";
  }


  public getNoticeTitle(notice?: HomeNewsItem | null): string {
    return String(notice?.titulo || "Aviso importante");
  }

  public deleteNotice(notice?: HomeNewsItem | null): void {
    this.requestDeleteNotice(notice);
  }

  public requestDeleteNotice(notice?: HomeNewsItem | null): void {
    const id = this.getNoticeId(notice);
    if (id === null || !this.canDeleteNotice(notice) || this.deletingId()) {
      return;
    }

    this.noticePendingDeletion.set(notice || null);
    this.deleteError.set("");
    this.showDeleteConfirm.set(true);
  }

  public cancelDeleteNotice(): void {
    if (this.deletingId()) return;

    this.noticePendingDeletion.set(null);
    this.deleteError.set("");
    this.showDeleteConfirm.set(false);
  }

  public confirmDeleteNotice(): void {
    const notice = this.noticePendingDeletion();
    const id = this.getNoticeId(notice);
    if (id === null || !this.canDeleteNotice(notice) || this.deletingId()) {
      return;
    }

    this.deletingId.set(id);
    this.deleteError.set("");
    this.newsError.set("");

    this.http
      .delete<
        ApiResponse<null>
      >(`${this.apiBase}/anuncios/${id}`, { withCredentials: true })
      .subscribe({
        next: () => {
          this.importantNews.update((items) =>
            items.filter((item) => this.getNoticeId(item) !== id),
          );
          if (this.getNoticeId(this.selectedNotice()) === id) {
            this.selectedNotice.set(null);
          }
          this.deletingId.set(null);
          this.noticePendingDeletion.set(null);
          this.deleteError.set("");
          this.showDeleteConfirm.set(false);
        },
        error: (error) => {
          this.deleteError.set(
            this.extractErrorMessage(error, "No se pudo eliminar el anuncio."),
          );
          this.deletingId.set(null);
        },
      });
  }

  public isDeletingPendingNotice(): boolean {
    const id = this.getNoticeId(this.noticePendingDeletion());
    return id !== null && this.deletingId() === id;
  }

  public goTo(link: string): void {
    this.router.navigate([link]);
  }

  public getPriorityText(priority?: string | number | null): string {
    const priorityMap: Record<string, string> = {
      NORMAL: "Normal",
      ALTA: "Alta",
      URGENTE: "Urgente",
    };

    const key = this.normalizePriority(priority);
    return priorityMap[key] || "Normal";
  }

  public getPriorityClass(priority?: string | number | null): string {
    const key = this.normalizePriority(priority);
    const classMap: Record<string, string> = {
      NORMAL: "news-card-priority-normal",
      ALTA: "news-card-priority-high",
      URGENTE: "news-card-priority-urgent",
    };

    return classMap[key] || "news-card-priority-normal";
  }

  public getCategoryText(category?: string | number | null): string {
    const categoryMap: Record<string, string> = {
      GENERAL: "General",
      ACADEMICA: "Académica",
      TRAMITES: "Trámites",
      EVENTO: "Evento",
      EMERGENCIA: "Emergencia",
      SISTEMA: "Sistema",
    };

    const key = String(category || "GENERAL").toUpperCase();
    return categoryMap[key] || String(category || "General");
  }

  public getNoticeImages(notice?: HomeNewsItem | null): NewsImage[] {
    if (!notice) return [];

    const images: NewsImage[] = [];
    const addImage = (value: any, fallbackName = "Imagen del aviso") => {
      if (!value) return;

      if (typeof value === "string") {
        const url = value.trim();
        if (url) {
          images.push({
            url,
            nombre_original: this.guessImageName(url) || fallbackName,
          });
        }
        return;
      }

      if (typeof value === "object") {
        const url = String(
          value.url ||
            value.imagen_url ||
            value.url_imagen ||
            value.image_url ||
            "",
        ).trim();
        if (url) {
          images.push({
            url,
            nombre_original:
              value.nombre_original ||
              value.nombre ||
              value.name ||
              this.guessImageName(url) ||
              fallbackName,
          });
        }
      }
    };

    const rawImages = notice.imagenes;
    if (Array.isArray(rawImages)) {
      rawImages.forEach((image) => addImage(image));
    } else if (typeof rawImages === "string") {
      this.parseMaybeJsonArray(rawImages).forEach((image) => addImage(image));
      if (!images.length) addImage(rawImages);
    }

    addImage(notice.imagen);
    addImage(notice.imagen_url);
    addImage(notice.url_imagen);
    addImage(notice.image_url);

    const seen = new Set<string>();
    return images.filter((image) => {
      if (!image.url || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
  }

  public getNoticeTags(notice?: HomeNewsItem | null): string[] {
    if (!notice) return [];

    const tags: string[] = [];
    const addTag = (tag?: string | null) => {
      const value = String(tag || "").trim();
      if (value && !tags.includes(value)) tags.push(value);
    };

    if (Array.isArray(notice.etiquetas)) {
      notice.etiquetas.forEach((tag) => addTag(tag));
    } else if (typeof notice.etiquetas === "string") {
      this.parseMaybeJsonArray(notice.etiquetas).forEach((tag) =>
        addTag(String(tag)),
      );
      if (!tags.length) {
        notice.etiquetas.split(",").forEach((tag) => addTag(tag));
      }
    }

    addTag(this.getCategoryText(notice.categoria));
    addTag(this.getPriorityText(notice.prioridad));
    if (notice.fijado) addTag("Fijado");
    if (notice.activo === false) addTag("Inactivo");

    this.getNoticeTargets(notice).forEach((target) => {
      if (target.tipo_usuario) addTag(`Rol: ${target.tipo_usuario}`);
      if (target.carrera) addTag(`Carrera: ${target.carrera}`);
      if (target.semestre) addTag(`Semestre: ${target.semestre}`);
      if (target.grupo) addTag(`Grupo: ${target.grupo}`);
      if (target.id_grupo && !target.grupo)
        addTag(`Grupo ID: ${target.id_grupo}`);
      if (target.id_grupo_materia)
        addTag(`Materia-grupo: ${target.id_grupo_materia}`);
    });

    const recipients = this.getNoticeRecipients(notice);
    if (recipients.length)
      addTag(`Destinatarios directos: ${recipients.length}`);

    return tags;
  }

  public getNoticeTargets(notice?: HomeNewsItem | null): NewsTarget[] {
    if (!notice) return [];

    const targets: NewsTarget[] = [];
    const addTarget = (target: any) => {
      if (!target || typeof target !== "object") return;
      const normalized: NewsTarget = {
        id_target: target.id_target,
        tipo_usuario: target.tipo_usuario || null,
        carrera: target.carrera || null,
        semestre: target.semestre || null,
        id_grupo: target.id_grupo || null,
        grupo: target.grupo || null,
        id_grupo_materia: target.id_grupo_materia || null,
      };

      const hasValue = Object.values(normalized).some(
        (value) => value !== null && value !== undefined && value !== "",
      );
      if (hasValue) targets.push(normalized);
    };

    if (Array.isArray(notice.targets)) {
      notice.targets.forEach((target) => addTarget(target));
    } else if (typeof notice.targets === "string") {
      this.parseMaybeJsonArray(notice.targets).forEach((target) =>
        addTarget(target),
      );
    }

    addTarget(notice.target);

    addTarget({
      tipo_usuario: notice.tipo_usuario,
      carrera: notice.carrera,
      semestre: notice.semestre,
      id_grupo: notice.id_grupo,
      grupo: notice.grupo,
      id_grupo_materia: notice.id_grupo_materia,
    });

    const seen = new Set<string>();
    return targets.filter((target) => {
      const key = JSON.stringify(target);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  public getNoticeRecipients(notice?: HomeNewsItem | null): string[] {
    if (!notice?.destinatarios) return [];

    if (Array.isArray(notice.destinatarios)) {
      return notice.destinatarios.map((item) => String(item)).filter(Boolean);
    }

    return String(notice.destinatarios)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  public formatDate(value?: string | number | Date | null): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  private handleNewsLoadError(error: any): void {
    this.newsError.set(
      this.extractErrorMessage(
        error,
        "Revisa tu conexión o intenta más tarde.",
      ),
    );
    this.newsLoading.set(false);
  }

  private canManageNotice(notice?: HomeNewsItem | null): boolean {
    const role = this.getCurrentRole();
    if (role === "ADMIN") return true;
    if (role !== "DOCENTE" && role !== "ADMINISTRATIVO") return false;

    const ownerId = Number(notice?.id_emisor);
    const userId = Number(this.currentUser()?.id_usuario);

    return (
      Number.isFinite(ownerId) && Number.isFinite(userId) && ownerId === userId
    );
  }

  private getCurrentRole(): string {
    return String(
      this.currentUser()?.tipo_usuario || this.userRol() || "INVITADO",
    ).toUpperCase();
  }

  private buildFormFromNotice(notice: HomeNewsItem): AnnouncementForm {
    const firstTarget = this.getNoticeTargets(notice)[0] || {};
    const firstImage = this.getNoticeImages(notice)[0];

    return {
      titulo: String(notice.titulo || ""),
      contenido: String(notice.contenido || ""),
      categoria: String(notice.categoria || ""),
      prioridad: notice.prioridad ? this.normalizePriority(notice.prioridad) : "",
      fijado: this.coerceBoolean(notice.fijado),
      activo:
        notice.activo === undefined || notice.activo === null
          ? true
          : this.coerceBoolean(notice.activo),
      visible_desde: this.toDateTimeLocalValue(notice.visible_desde),
      visible_hasta: this.toDateTimeLocalValue(notice.visible_hasta),
      destinatarios: this.getNoticeRecipients(notice).join(", "),
      target_tipo_usuario: String(firstTarget.tipo_usuario || ""),
      target_carrera: String(firstTarget.carrera || ""),
      target_semestre: firstTarget.semestre ? String(firstTarget.semestre) : "",
      target_id_grupo: firstTarget.id_grupo ? String(firstTarget.id_grupo) : "",
      target_id_grupo_materia: firstTarget.id_grupo_materia
        ? String(firstTarget.id_grupo_materia)
        : "",
      image_url: firstImage?.url || "",
      image_name: firstImage?.nombre_original || "",
    };
  }

  private toDateTimeLocalValue(value?: string | number | Date | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const pad = (item: number) => String(item).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private coerceBoolean(value: any): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    return ["true", "1", "si", "sí", "yes"].includes(
      String(value).toLowerCase(),
    );
  }

  private getNoticeId(notice?: HomeNewsItem | null): number | null {
    const value = Number(notice?.id_anuncio);
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  private guessImageName(url: string): string {
    try {
      const cleanUrl = url.split("?")[0].split("#")[0];
      return decodeURIComponent(cleanUrl.split("/").pop() || "");
    } catch {
      return "";
    }
  }

  private parseMaybeJsonArray(value: string): any[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private buildAnnouncementPayload(): any | null {
    const form = this.createForm();
    const contenido = form.contenido.trim();

    if (!contenido) {
      this.postError.set("El contenido del anuncio es obligatorio.");
      return null;
    }

    const categoria = String(form.categoria || "").trim().toUpperCase();
    if (!categoria) {
      this.postError.set("Selecciona una categoría o cancela el formulario.");
      return null;
    }

    const prioridadCruda = String(form.prioridad || "").trim().toUpperCase();
    if (!prioridadCruda) {
      this.postError.set(
        "Selecciona un nivel de urgencia o cancela el formulario.",
      );
      return null;
    }

    const prioridadesPermitidas = this.priorities.map((item) => item.value);
    if (!prioridadesPermitidas.includes(prioridadCruda)) {
      this.postError.set("Selecciona una prioridad válida.");
      return null;
    }

    const payload: any = {
      contenido,
      titulo: form.titulo.trim() || null,
      categoria,
      prioridad: prioridadCruda,
      fijado: Boolean(form.fijado),
      activo: Boolean(form.activo),
      visible_desde: form.visible_desde || null,
      visible_hasta: form.visible_hasta || null,
    };

    const recipientIds = this.parseIdList(form.destinatarios);
    payload.destinatarios = recipientIds;

    const target = this.buildTargetPayload(form);
    payload.targets = target ? [target] : [];
    payload.target = target;

    const imageUrl = form.image_url.trim();
    payload.imagenes = imageUrl
      ? [
          {
            url: imageUrl,
            nombre_original:
              form.image_name.trim() ||
              this.guessImageName(imageUrl) ||
              "imagen-anuncio",
          },
        ]
      : [];

    return payload;
  }

  private buildTargetPayload(form: AnnouncementForm): any | null {
    const target: any = {};
    const semester = this.parseOptionalNumber(form.target_semestre);
    const groupId = this.parseOptionalNumber(form.target_id_grupo);
    const groupSubjectId = this.parseOptionalNumber(
      form.target_id_grupo_materia,
    );

    if (form.target_tipo_usuario)
      target.tipo_usuario = form.target_tipo_usuario;
    if (form.target_carrera.trim()) target.carrera = form.target_carrera.trim();
    if (semester !== null) target.semestre = semester;
    if (groupId !== null) target.id_grupo = groupId;
    if (groupSubjectId !== null) target.id_grupo_materia = groupSubjectId;

    return Object.keys(target).length > 0 ? target : null;
  }

  private parseIdList(value: string): number[] {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  private parseOptionalNumber(value: string): number | null {
    if (!value.trim()) return null;

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private getAnnouncementListEndpoint(): string {
    return this.isAdminUser() ? "/anuncios" : "/anuncios/noticias-importantes";
  }

  private isAdminUser(): boolean {
    const roleFromSession = String(
      this.currentUser()?.tipo_usuario || "",
    ).toUpperCase();
    const roleFromAuth = String(this.userRol() || "").toUpperCase();
    return roleFromSession === "ADMIN" || roleFromAuth === "ADMIN";
  }

  private getResponseData<T>(response: any, fallback: T): T {
    if (Array.isArray(response)) return response as T;
    if (response?.data !== undefined) return response.data as T;
    return fallback;
  }

  private mergeNewsLists(...lists: HomeNewsItem[][]): HomeNewsItem[] {
    const merged = new Map<string, HomeNewsItem>();

    lists.flat().forEach((item) => {
      const id = this.getNoticeId(item);
      const key = id !== null ? `id:${id}` : `tmp:${JSON.stringify(item)}`;
      merged.set(key, { ...(merged.get(key) || {}), ...item });
    });

    return Array.from(merged.values());
  }

  private normalizeNewsList(items: HomeNewsItem[]): HomeNewsItem[] {
    return [...items].sort((a, b) => {
      const fixedA = a.fijado ? 1 : 0;
      const fixedB = b.fijado ? 1 : 0;

      if (fixedA !== fixedB) return fixedB - fixedA;

      const dateA = new Date(String(a.fecha || "")).getTime();
      const dateB = new Date(String(b.fecha || "")).getTime();

      return (
        (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA)
      );
    });
  }

  private buildStorageFileName(file: File): string {
    const rawName = file.name || "imagen.png";
    const extensionMatch = rawName.match(/\.[a-zA-Z0-9]+$/);
    const extension = extensionMatch ? extensionMatch[0].toLowerCase() : ".png";
    const baseName = rawName.replace(/\.[^/.]+$/, "");
    const cleanBase = this.sanitizeFileName(baseName) || "imagen";
    const userKey = this.sanitizeFileName(
      this.currentUser()?.nombre_usuario ||
        `usuario_${this.currentUser()?.id_usuario || "anonimo"}`,
    );

    return `anuncio_${userKey}_${Date.now()}_${cleanBase}${extension}`;
  }

  private sanitizeFileName(value: string): string {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const detail = error?.error?.detail;

    if (typeof detail === "string") return detail;
    if (detail?.message) return detail.message;
    if (error?.error?.message) return error.error.message;

    return fallback;
  }

  private normalizePriority(priority?: string | number | null): string {
    const value = String(priority || "NORMAL").trim().toUpperCase();
    return ["NORMAL", "ALTA", "URGENTE"].includes(value)
      ? value
      : "NORMAL";
  }

  private getDefaultForm(): AnnouncementForm {
    return {
      titulo: "",
      contenido: "",
      categoria: "",
      prioridad: "",
      fijado: true,
      activo: true,
      visible_desde: "",
      visible_hasta: "",
      destinatarios: "",
      target_tipo_usuario: "",
      target_carrera: "",
      target_semestre: "",
      target_id_grupo: "",
      target_id_grupo_materia: "",
      image_url: "",
      image_name: "",
    };
  }
}
