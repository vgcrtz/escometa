import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImagenService {
  private supabase: SupabaseClient;

  constructor() {
    console.log("URL Supabase:", environment.supabase.url);
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);
  }

  /**
   * Sube una imagen a un bucket de Supabase y retorna su URL pública
   * @param file Archivo binario de la imagen
   * @param bucket Nombre del bucket en Supabase (ej: 'avatars')
   * @param path Ruta interna/Nombre del archivo (ej: 'avatar_vgcrtz.png')
   */
  async subirImagen(file: File, bucket: string, path: string): Promise<string> {
    try {
      // 1. Subimos el archivo. 'upsert: true' permite sobrescribir la foto si el usuario sube otra
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) throw error;

      // 2. CORREÇÃO: Obtendo a URL pública de forma limpa, direta e sem erros
      const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error en Supabase Storage:', error);
      throw error;
    }
  }
}
