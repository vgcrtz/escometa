import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImagenService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);
  }

  /**
   * Sube o actualiza una imagen en un bucket de Supabase y retorna su URL pública
   * @param file Archivo binario de la imagen
   * @param bucket Nombre del bucket en Supabase (ej: 'imagenes')
   * @param path Ruta interna/Nombre del archivo (ej: 'avatar_nickname.png')
   */
  async subirImagen(file: File, bucket: string, path: string): Promise<string> {
    try {
      // Configuramos upsert y cacheControl en '0'
      const { data, error } = await this.supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        cacheControl: '0', // <--- CRUCIAL: Le dice a Supabase que actualice la CDN de inmediato
      });

      if (error) throw error;

      // Obtenemos la URL pública de forma directa
      const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error en Supabase Storage:', error);
      throw error;
    }
  }
}
