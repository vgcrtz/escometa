import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { variables_globales } from '../variables-globales';

export interface ImportantNewsImage {
  url: string;
  path_storage?: string;
  nombre_original?: string;
}

export interface ImportantNewsItem {
  id_anuncio: number;
  titulo?: string;
  contenido: string;
  fecha: string;
  id_emisor?: number;
  categoria?: string;
  prioridad?: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  fijado?: boolean;
  imagenes?: ImportantNewsImage[];
}

interface ApiEnvelope<T> {
  status: string;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ImportantNewsService {
  private http = inject(HttpClient);
  private api = variables_globales.server_url.replace(/\/$/, '');

  public getImportantNews(): Observable<ApiEnvelope<ImportantNewsItem[]>> {
    return this.http.get<ApiEnvelope<ImportantNewsItem[]>>(`${this.api}/anuncios/noticias-importantes`, {
      withCredentials: true,
    });
  }
}
