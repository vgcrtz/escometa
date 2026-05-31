import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Auth } from '../services/auth';
import { ImagenService } from '../services/imagen.service';

@Component({
  selector: 'app-perfil',
  imports: [CommonModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private authService = inject(Auth);
  private supabaseStorage = inject(ImagenService);
  private location = inject(Location);

  // Estados reactivos basados en Signals
  public userData = signal<any>(null);
  public isLoading = signal<boolean>(true);
  public isUploading = signal<boolean>(false);

  // Fallback solicitado: icono por defecto si no hay foto_perfil_url
  public defaultAvatar = 'user.png';

  public isAdmin = computed(() => this.userData()?.tipo_usuario === 'ADMIN');

  ngOnInit(): void {
    this.cargarDatosDeUsuario();
  }

  cargarDatosDeUsuario(): void {
    this.authService.obtener_datos_usuario().subscribe({
      next: (respuesta) => {
        const data = respuesta?.data || respuesta;
        this.userData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al recuperar credenciales:', err);
        this.isLoading.set(false);
      },
    });
  }

  async onFotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const archivo = input.files[0];
    if (!archivo.type.startsWith('image/')) return;

    this.isUploading.set(true);

    try {
      // Definimos el nombre del archivo usando el nickname único del usuario
      const nickname = (this.userData()?.nombre_usuario || 'default').replace(/\s+/g, '_');
      const nombreArchivo = `avatar_${nickname}.png`;

      // 1. Invocamos la subida hacia el bucket 'avatars' de Supabase
      const urlPublicaSupabase = await this.supabaseStorage.subirImagen(
        archivo,
        'imagenes',
        nombreArchivo,
      );

      // 2. Reportamos la nueva URL a tu API central en Python/PHP
      this.authService.subir_foto_perfil(urlPublicaSupabase).subscribe({
        next: () => {
          // 3. Modificamos la propiedad exacta data.foto_perfil_url reactivamente
          this.userData.update((current) => ({
            ...current,
            foto_perfil_url: urlPublicaSupabase,
          }));
          this.isUploading.set(false);
        },
        error: (err) => {
          console.error('Error al registrar URL en la BD de ESCOMETA:', err);
          this.isUploading.set(false);
        },
      });
    } catch (error) {
      console.error('Error al interactuar con Supabase Cloud:', error);
      this.isUploading.set(false);
    }
  }

  regresar(): void {
    this.location.back();
  }
}
