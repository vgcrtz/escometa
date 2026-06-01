import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { Auth } from "../services/auth";
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

type SearchNewsItem = {
  id_anuncio?: number | string | null;
  titulo?: string | null;
  contenido?: string | null;
  descripcion?: string | null;
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
  autor?: string | null;
  imagenes?: NewsImage[] | string | null;
  imagen?: NewsImage | string | null;
  imagen_url?: string | null;
  url_imagen?: string | null;
  image_url?: string | null;
  targets?: NewsTarget[] | string | null;
  target?: NewsTarget | null;
  destinatarios?: Array<number | string> | string | null;
  etiquetas?: string[] | string | null;
  tags?: string[] | string | null;
  grupo?: string | null;
  [key: string]: any;
};

@Component({
  selector: "app-busqueda",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./busqueda.html",
  styleUrl: "./busqueda.css",
})
export class Busqueda implements OnInit {
  private authService = inject(Auth);
  private http = inject(HttpClient);
  private apiBase = variables_globales.server_url.replace(/\/$/, "");
  private endpointErrors = 0;

  public isLoggedIn = this.authService.isLoggedIn;
  public userRol = this.authService.userRol;

  public filtroSeleccionado = signal<string>("todo");
  public terminoBusqueda = signal<string>("");
  public noticias = signal<SearchNewsItem[]>([]);
  public cargando = signal<boolean>(false);
  public errorBusqueda = signal<string>("");
  public usuarioActual = signal<any>(null);
  public selectedNotice = signal<SearchNewsItem | null>(null);
  public detailLoadingId = signal<number | null>(null);

  public filtros = [
    { value: "todo", label: "Todo" },
    { value: "academica", label: "Información académica" },
    { value: "tramites", label: "Trámites" },
    { value: "anuncios", label: "Anuncios" },
    { value: "eventos", label: "Eventos" },
  ];

  public resultadosFiltrados = computed(() => {
    const term = this.normalizeText(this.terminoBusqueda());
    const selectedFilter = this.filtroSeleccionado();

    return this.noticias().filter((notice) => {
      const matchesFilter = this.matchesFilter(notice, selectedFilter);
      if (!matchesFilter) return false;

      if (!term) return true;
      return this.buildSearchText(notice).includes(term);
    });
  });

  public hayFiltrosActivos = computed(
    () => this.filtroSeleccionado() !== "todo" || !!this.terminoBusqueda().trim(),
  );

  ngOnInit(): void {
    this.loadCurrentUserAndNews();
  }

  public seleccionarFiltro(nombre: string): void {
    this.filtroSeleccionado.set(nombre);
  }

  public actualizarBusqueda(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.terminoBusqueda.set(target.value);
  }

  public limpiarBusqueda(): void {
    this.terminoBusqueda.set("");
  }

  public limpiarFiltros(): void {
    this.terminoBusqueda.set("");
    this.filtroSeleccionado.set("todo");
  }

  public recargarNoticias(): void {
    this.loadNews();
  }

  public openNoticeDetail(notice?: SearchNewsItem | null): void {
    if (!notice) return;

    this.selectedNotice.set(notice);

    const id = this.getNoticeId(notice);
    if (id === null) return;

    this.detailLoadingId.set(id);
    this.http
      .get<ApiResponse<SearchNewsItem>>(`${this.apiBase}/anuncios/${id}`, {
        withCredentials: true,
      })
      .pipe(
        catchError((error) => {
          console.warn("No se pudo recuperar el detalle completo del aviso:", error);
          return of(null);
        }),
      )
      .subscribe((response) => {
        const fullNotice = response ? this.getResponseData<SearchNewsItem>(response, notice) : notice;
        const merged = this.mergeNotice(notice, fullNotice);
        this.selectedNotice.set(merged);
        this.noticias.update((items) =>
          items.map((item) => (this.getNoticeId(item) === id ? merged : item)),
        );
        this.detailLoadingId.set(null);
      });
  }

  public closeNoticeDetail(): void {
    this.selectedNotice.set(null);
    this.detailLoadingId.set(null);
  }

  public getNoticeTitle(notice?: SearchNewsItem | null): string {
    return String(notice?.titulo || notice?.contenido || "Aviso importante");
  }

  public getNoticeDescription(notice?: SearchNewsItem | null): string {
    return String(notice?.descripcion || notice?.contenido || "");
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
      NORMAL: "resultado-priority-normal",
      ALTA: "resultado-priority-high",
      URGENTE: "resultado-priority-urgent",
    };

    return classMap[key] || "resultado-priority-normal";
  }

  public getCategoryText(category?: string | number | null): string {
    const categoryMap: Record<string, string> = {
      GENERAL: "General",
      ACADEMICA: "Académica",
      ACADEMICO: "Académica",
      TRAMITES: "Trámites",
      TRAMITE: "Trámites",
      EVENTO: "Evento",
      EVENTOS: "Evento",
      EMERGENCIA: "Emergencia",
      SISTEMA: "Sistema",
      ANUNCIO: "Anuncio",
      AVISO: "Anuncio",
    };

    const key = String(category || "GENERAL").toUpperCase();
    return categoryMap[key] || String(category || "General");
  }

  public getNoticeImages(notice?: SearchNewsItem | null): NewsImage[] {
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

  public getNoticeTags(notice?: SearchNewsItem | null): string[] {
    if (!notice) return [];

    const tags: string[] = [];
    const addTag = (tag?: string | number | null) => {
      const value = String(tag || "").trim();
      if (value && !tags.includes(value)) tags.push(value);
    };

    const addTagsFromUnknown = (value: any) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((tag) => addTag(tag));
        return;
      }
      if (typeof value === "string") {
        const parsed = this.parseMaybeJsonArray(value);
        if (parsed.length) {
          parsed.forEach((tag) => addTag(tag));
          return;
        }
        value.split(",").forEach((tag) => addTag(tag));
      }
    };

    addTagsFromUnknown(notice.etiquetas);
    addTagsFromUnknown(notice.tags);

    addTag(this.getCategoryText(notice.categoria));
    addTag(this.getPriorityText(notice.prioridad));
    if (this.coerceBoolean(notice.fijado)) addTag("Fijado");
    if (notice.activo !== undefined && notice.activo !== null && !this.coerceBoolean(notice.activo)) {
      addTag("Inactivo");
    }

    this.getNoticeTargets(notice).forEach((target) => {
      if (target.tipo_usuario) addTag(`Rol: ${target.tipo_usuario}`);
      if (target.carrera) addTag(`Carrera: ${target.carrera}`);
      if (target.semestre) addTag(`Semestre: ${target.semestre}`);
      if (target.grupo) addTag(`Grupo: ${target.grupo}`);
      if (target.id_grupo && !target.grupo) addTag(`Grupo ID: ${target.id_grupo}`);
      if (target.id_grupo_materia) addTag(`Materia-grupo: ${target.id_grupo_materia}`);
    });

    const recipients = this.getNoticeRecipients(notice);
    if (recipients.length) addTag(`Destinatarios directos: ${recipients.length}`);

    return tags;
  }

  public getVisibleTags(notice?: SearchNewsItem | null): string[] {
    return this.getNoticeTags(notice).slice(0, 5);
  }

  public getNoticeTargets(notice?: SearchNewsItem | null): NewsTarget[] {
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
      this.parseMaybeJsonArray(notice.targets).forEach((target) => addTarget(target));
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

  public getNoticeRecipients(notice?: SearchNewsItem | null): string[] {
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

  public isDetailLoading(notice?: SearchNewsItem | null): boolean {
    const id = this.getNoticeId(notice);
    return id !== null && this.detailLoadingId() === id;
  }

  private loadCurrentUserAndNews(): void {
    if (!this.isLoggedIn()) {
      this.usuarioActual.set(null);
      this.noticias.set([]);
      return;
    }

    this.http
      .get<ApiResponse<any>>(`${this.apiBase}/auth/me`, { withCredentials: true })
      .pipe(
        catchError((error) => {
          console.warn("No se pudo recuperar la sesión actual:", error);
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.usuarioActual.set(response?.data || null);
        this.loadNews();
      });
  }

  private loadNews(): void {
    this.cargando.set(true);
    this.errorBusqueda.set("");
    this.endpointErrors = 0;

    const canUseAllNewsEndpoint = this.canUseStaffEndpoints();

    forkJoin({
      all: canUseAllNewsEndpoint
        ? this.safeGetNewsList("/anuncios")
        : of<ApiResponse<SearchNewsItem[]>>({ data: [] }),
      relevant: this.safeGetNewsList("/anuncios/noticias-importantes"),
      own: this.safeGetNewsList("/anuncios/mis-anuncios"),
    }).subscribe({
      next: ({ all, relevant, own }) => {
        const merged = this.mergeNewsLists(
          this.getResponseData<SearchNewsItem[]>(all, []),
          this.getResponseData<SearchNewsItem[]>(relevant, []),
          this.getResponseData<SearchNewsItem[]>(own, []),
        );

        this.noticias.set(this.normalizeNewsList(merged));
        this.cargando.set(false);

        if (!merged.length && this.endpointErrors > 0) {
          this.errorBusqueda.set(
            "No se pudieron cargar las noticias. Revisa tu conexión o intenta de nuevo.",
          );
        }
      },
      error: (error) => {
        this.cargando.set(false);
        this.errorBusqueda.set(
          this.extractErrorMessage(error, "No se pudieron cargar las noticias."),
        );
      },
    });
  }

  private safeGetNewsList(endpoint: string) {
    return this.http
      .get<ApiResponse<SearchNewsItem[]>>(`${this.apiBase}${endpoint}`, {
        withCredentials: true,
      })
      .pipe(
        catchError((error) => {
          this.endpointErrors += 1;
          console.warn(`No se pudo cargar ${endpoint}:`, error);
          return of<ApiResponse<SearchNewsItem[]>>({ data: [] });
        }),
      );
  }

  private canUseStaffEndpoints(): boolean {
    const role = this.getCurrentRole();
    return role === "ADMIN" || role === "DOCENTE" || role === "ADMINISTRATIVO";
  }

  private getCurrentRole(): string {
    return String(
      this.usuarioActual()?.tipo_usuario || this.userRol() || "INVITADO",
    ).toUpperCase();
  }

  private matchesFilter(notice: SearchNewsItem, filter: string): boolean {
    if (filter === "todo") return true;

    const category = String(notice.categoria || "").toUpperCase();
    const searchText = this.buildSearchText(notice);
    const hasAcademicTarget = this.getNoticeTargets(notice).some(
      (target) => !!target.carrera || !!target.semestre || !!target.grupo || !!target.id_grupo || !!target.id_grupo_materia,
    );

    switch (filter) {
      case "academica":
        return (
          category === "ACADEMICA" ||
          category === "ACADEMICO" ||
          hasAcademicTarget ||
          searchText.includes("academ") ||
          searchText.includes("materia") ||
          searchText.includes("grupo") ||
          searchText.includes("semestre")
        );
      case "tramites":
        return category === "TRAMITES" || category === "TRAMITE" || searchText.includes("tramite");
      case "anuncios":
        return (
          !category ||
          category === "GENERAL" ||
          category === "ANUNCIO" ||
          category === "AVISO" ||
          category === "SISTEMA" ||
          category === "EMERGENCIA" ||
          searchText.includes("anuncio") ||
          searchText.includes("aviso")
        );
      case "eventos":
        return category === "EVENTO" || category === "EVENTOS" || searchText.includes("evento");
      default:
        return true;
    }
  }

  private buildSearchText(notice: SearchNewsItem): string {
    const pieces: string[] = [
      this.getNoticeTitle(notice),
      this.getNoticeDescription(notice),
      String(notice.contenido || ""),
      String(notice.categoria || ""),
      this.getCategoryText(notice.categoria),
      String(notice.prioridad || ""),
      this.getPriorityText(notice.prioridad),
      String(notice.emisor || notice.autor || ""),
      String(notice.id_emisor || ""),
      String(notice.id_anuncio || ""),
      ...this.getNoticeTags(notice),
      ...this.getNoticeRecipients(notice),
      ...this.getNoticeImages(notice).map((image) => image.nombre_original || ""),
    ];

    this.getNoticeTargets(notice).forEach((target) => {
      pieces.push(
        String(target.tipo_usuario || ""),
        String(target.carrera || ""),
        String(target.semestre || ""),
        String(target.grupo || ""),
        String(target.id_grupo || ""),
        String(target.id_grupo_materia || ""),
      );
    });

    return this.normalizeText(pieces.join(" "));
  }

  private normalizeText(value: string): string {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private mergeNewsLists(...lists: SearchNewsItem[][]): SearchNewsItem[] {
    const merged = new Map<string, SearchNewsItem>();

    lists.flat().forEach((item) => {
      if (!item) return;
      const id = this.getNoticeId(item);
      const key = id !== null ? `id:${id}` : `tmp:${JSON.stringify(item)}`;
      merged.set(key, this.mergeNotice(merged.get(key), item));
    });

    return Array.from(merged.values());
  }

  private mergeNotice(
    original?: SearchNewsItem | null,
    incoming?: SearchNewsItem | null,
  ): SearchNewsItem {
    const merged = { ...(original || {}), ...(incoming || {}) };

    return {
      ...merged,
      imagenes: incoming?.imagenes ?? original?.imagenes ?? merged.imagenes,
      targets: incoming?.targets ?? original?.targets ?? merged.targets,
      destinatarios:
        incoming?.destinatarios ?? original?.destinatarios ?? merged.destinatarios,
      etiquetas: incoming?.etiquetas ?? original?.etiquetas ?? merged.etiquetas,
      tags: incoming?.tags ?? original?.tags ?? merged.tags,
    };
  }

  private normalizeNewsList(items: SearchNewsItem[]): SearchNewsItem[] {
    return [...items].sort((a, b) => {
      const fixedA = this.coerceBoolean(a.fijado) ? 1 : 0;
      const fixedB = this.coerceBoolean(b.fijado) ? 1 : 0;
      if (fixedA !== fixedB) return fixedB - fixedA;

      const priorityScore: Record<string, number> = { URGENTE: 3, ALTA: 2, NORMAL: 1 };
      const priorityA = priorityScore[this.normalizePriority(a.prioridad)] || 1;
      const priorityB = priorityScore[this.normalizePriority(b.prioridad)] || 1;
      if (priorityA !== priorityB) return priorityB - priorityA;

      const dateA = new Date(String(a.fecha || "")).getTime();
      const dateB = new Date(String(b.fecha || "")).getTime();
      return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
    });
  }

  private getResponseData<T>(response: any, fallback: T): T {
    if (Array.isArray(response)) return response as T;
    if (response?.data !== undefined) return response.data as T;
    return fallback;
  }

  private getNoticeId(notice?: SearchNewsItem | null): number | null {
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

  private coerceBoolean(value: any): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    return ["true", "1", "si", "sí", "yes"].includes(String(value).toLowerCase());
  }

  private normalizePriority(priority?: string | number | null): string {
    const value = String(priority || "NORMAL").trim().toUpperCase();
    return ["NORMAL", "ALTA", "URGENTE"].includes(value) ? value : "NORMAL";
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const detail = error?.error?.detail;
    if (typeof detail === "string") return detail;
    if (detail?.message) return detail.message;
    if (error?.error?.message) return error.error.message;
    return fallback;
  }
}
