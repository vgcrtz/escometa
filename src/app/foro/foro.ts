import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { variables_globales } from '../variables-globales';
import { ImagenService } from '../services/imagen.service';

interface ForumUser {
  id_usuario: number;
  nombre?: string;
  nombre_usuario?: string;
  correo?: string;
  foto_perfil_url?: string;
  tipo_usuario?: string;
}

interface ForumAttachment {
  id_attachment?: number;
  url: string;
  storage_path?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
}

interface ForumCommunity {
  id_community: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_by: number;
  creator?: ForumUser | null;
  created_at?: string;
  updated_at?: string;
  active?: boolean;
  message_count?: number;
  image_count?: number;
  last_message?: ForumMessage | null;
}

interface ForumMessage {
  id_message: number;
  id_community: number;
  id_sender: number;
  sender?: ForumUser | null;
  content?: string | null;
  message_type: string;
  created_at: string;
  edited_at?: string | null;
  edited: boolean;
  deleted: boolean;
  pinned: boolean;
  reply_message_id?: number | null;
  attachments: ForumAttachment[];
}

@Component({
  selector: 'app-foro',
  imports: [CommonModule, FormsModule],
  templateUrl: './foro.html',
  styleUrl: './foro.css',
})
export class Foro implements OnInit {
  @ViewChild('messageScroller') private messageScroller?: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private imageService = inject(ImagenService);
  private apiUrl = variables_globales.server_url.replace(/\/$/, '');

  public currentUser = signal<ForumUser | null>(null);
  public communities = signal<ForumCommunity[]>([]);
  public selectedCommunity = signal<ForumCommunity | null>(null);
  public messages = signal<ForumMessage[]>([]);
  public pinnedMessages = signal<ForumMessage[]>([]);
  public communityImages = signal<ForumAttachment[]>([]);

  public isLoadingCommunities = signal<boolean>(false);
  public isLoadingMessages = signal<boolean>(false);
  public isSending = signal<boolean>(false);
  public errorMessage = signal<string>('');

  public newMessage = signal<string>('');
  public selectedFiles = signal<File[]>([]);
  public imagePreviewUrls = signal<string[]>([]);

  public showCreateModal = signal<boolean>(false);
  public communityName = signal<string>('');
  public communityDescription = signal<string>('');

  public isGuest = computed(() => {
    const user = this.currentUser();
    return !user?.id_usuario || user.tipo_usuario === 'INVITADO';
  });

  public canCreateCommunity = computed(() => {
    const user = this.currentUser();
    return !!user?.id_usuario && !this.isGuest();
  });

  public canSendMessage = computed(() => {
    return this.canCreateCommunity() && !!this.selectedCommunity() && !this.isSending();
  });

  public canManageSelectedCommunity = computed(() => {
    const user = this.currentUser();
    const community = this.selectedCommunity();

    if (!user || !community) return false;
    return user.tipo_usuario === 'ADMIN' || user.id_usuario === community.created_by;
  });

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadCommunities();
  }

  public loadCurrentUser(): void {
    this.http.get<any>(`${this.apiUrl}/auth/me`, { withCredentials: true }).subscribe({
      next: (response) => {
        const data = response?.data || null;
        this.currentUser.set(data);
      },
      error: () => {
        this.currentUser.set(null);
      },
    });
  }

  public loadCommunities(): void {
    this.isLoadingCommunities.set(true);

    this.http.get<any>(`${this.apiUrl}/foros/comunidades`, { withCredentials: true }).subscribe({
      next: (response) => {
        const data = response?.data || [];
        this.communities.set(data);
        this.isLoadingCommunities.set(false);

        const selected = this.selectedCommunity();
        if (!selected && data.length > 0) {
          this.selectCommunity(data[0]);
          return;
        }

        if (selected) {
          const updated = data.find((item: ForumCommunity) => item.id_community === selected.id_community);
          if (updated) this.selectedCommunity.set({ ...selected, ...updated });
        }
      },
      error: (error) => {
        this.errorMessage.set(this.getErrorText(error));
        this.isLoadingCommunities.set(false);
      },
    });
  }

  public selectCommunity(community: ForumCommunity): void {
    this.selectedCommunity.set(community);
    this.messages.set([]);
    this.pinnedMessages.set([]);
    this.communityImages.set([]);
    this.loadCommunityPanel(community.id_community);
    this.loadMessages();
  }

  public loadCommunityPanel(idCommunity: number): void {
    this.http.get<any>(`${this.apiUrl}/foros/comunidades/${idCommunity}`, { withCredentials: true }).subscribe({
      next: (response) => {
        this.selectedCommunity.set(response?.data || this.selectedCommunity());
      },
      error: (error) => this.errorMessage.set(this.getErrorText(error)),
    });

    this.loadPinnedMessages(idCommunity);
    this.loadCommunityImages(idCommunity);
  }

  public loadMessages(): void {
    const community = this.selectedCommunity();
    if (!community) return;

    this.isLoadingMessages.set(true);

    this.http
      .get<any>(`${this.apiUrl}/foros/comunidades/${community.id_community}/mensajes?limit=100&offset=0`, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          this.messages.set(response?.data || []);
          this.isLoadingMessages.set(false);
          this.scrollToBottom();
        },
        error: (error) => {
          this.errorMessage.set(this.getErrorText(error));
          this.isLoadingMessages.set(false);
        },
      });
  }

  public loadPinnedMessages(idCommunity: number): void {
    this.http.get<any>(`${this.apiUrl}/foros/comunidades/${idCommunity}/anclados`, { withCredentials: true }).subscribe({
      next: (response) => this.pinnedMessages.set(response?.data || []),
      error: () => this.pinnedMessages.set([]),
    });
  }

  public loadCommunityImages(idCommunity: number): void {
    this.http.get<any>(`${this.apiUrl}/foros/comunidades/${idCommunity}/imagenes`, { withCredentials: true }).subscribe({
      next: (response) => this.communityImages.set(response?.data || []),
      error: () => this.communityImages.set([]),
    });
  }

  public openCreateModal(): void {
    if (!this.canCreateCommunity()) return;

    this.communityName.set('');
    this.communityDescription.set('');
    this.showCreateModal.set(true);
  }

  public closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  public createCommunity(): void {
    const name = this.communityName().trim();

    if (!name) {
      this.errorMessage.set('Ingresa un nombre para la comunidad.');
      return;
    }

    const payload = {
      name,
      description: this.communityDescription().trim() || null,
    };

    this.http.post<any>(`${this.apiUrl}/foros/comunidades`, payload, { withCredentials: true }).subscribe({
      next: (response) => {
        const community = response?.data;
        this.closeCreateModal();
        this.loadCommunities();

        if (community) {
          this.selectCommunity(community);
        }
      },
      error: (error) => this.errorMessage.set(this.getErrorText(error)),
    });
  }

  public onImageInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []).filter((file) => file.type.startsWith('image/'));

    if (files.length === 0) return;

    const currentFiles = this.selectedFiles();
    const currentPreviews = this.imagePreviewUrls();

    this.selectedFiles.set([...currentFiles, ...files]);
    this.imagePreviewUrls.set([...currentPreviews, ...files.map((file) => URL.createObjectURL(file))]);

    input.value = '';
  }

  public removeSelectedImage(index: number): void {
    const previews = [...this.imagePreviewUrls()];
    const files = [...this.selectedFiles()];

    const preview = previews[index];
    if (preview) URL.revokeObjectURL(preview);

    previews.splice(index, 1);
    files.splice(index, 1);

    this.imagePreviewUrls.set(previews);
    this.selectedFiles.set(files);
  }

  public clearComposer(): void {
    this.newMessage.set('');
    this.selectedFiles.set([]);

    this.imagePreviewUrls().forEach((url) => URL.revokeObjectURL(url));
    this.imagePreviewUrls.set([]);
  }

  public async sendMessage(): Promise<void> {
    const community = this.selectedCommunity();
    const content = this.newMessage().trim();

    if (!community || this.isSending()) return;
    if (!content && this.selectedFiles().length === 0) return;

    this.isSending.set(true);
    this.errorMessage.set('');

    try {
      const attachments = await this.uploadFiles(community.id_community);
      const payload = {
        content: content || null,
        message_type: attachments.length > 0 ? 'IMAGE' : 'TEXT',
        attachments,
      };

      this.http
        .post<any>(`${this.apiUrl}/foros/comunidades/${community.id_community}/mensajes`, payload, {
          withCredentials: true,
        })
        .subscribe({
          next: () => {
            this.clearComposer();
            this.isSending.set(false);
            this.loadMessages();
            this.loadCommunityPanel(community.id_community);
            this.loadCommunities();
          },
          error: (error) => {
            this.errorMessage.set(this.getErrorText(error));
            this.isSending.set(false);
          },
        });
    } catch (error) {
      this.errorMessage.set('No se pudo subir la imagen.');
      this.isSending.set(false);
    }
  }

  public deleteMessage(message: ForumMessage): void {
    if (!this.canDeleteMessage(message)) return;

    const confirmed = window.confirm('¿Quieres borrar este mensaje?');
    if (!confirmed) return;

    this.http.delete<any>(`${this.apiUrl}/foros/mensajes/${message.id_message}`, { withCredentials: true }).subscribe({
      next: () => {
        const community = this.selectedCommunity();
        this.loadMessages();

        if (community) {
          this.loadCommunityPanel(community.id_community);
          this.loadCommunities();
        }
      },
      error: (error) => this.errorMessage.set(this.getErrorText(error)),
    });
  }

  public toggleMessagePin(message: ForumMessage): void {
    if (!this.canPinMessage()) return;

    const payload = { pinned: !message.pinned };

    this.http
      .put<any>(`${this.apiUrl}/foros/mensajes/${message.id_message}/pin`, payload, { withCredentials: true })
      .subscribe({
        next: () => {
          const community = this.selectedCommunity();
          this.loadMessages();

          if (community) this.loadCommunityPanel(community.id_community);
        },
        error: (error) => this.errorMessage.set(this.getErrorText(error)),
      });
  }

  public canDeleteMessage(message: ForumMessage): boolean {
    const user = this.currentUser();
    if (!user || this.isGuest()) return false;

    return user.tipo_usuario === 'ADMIN' || this.canManageSelectedCommunity() || message.id_sender === user.id_usuario;
  }

  public canPinMessage(): boolean {
    return this.canManageSelectedCommunity();
  }

  public getMessageClass(message: ForumMessage): string {
    const user = this.currentUser();
    return user?.id_usuario === message.id_sender ? 'outgoing-message' : 'incoming-message';
  }

  public getDisplayName(message: ForumMessage): string {
    if (message.sender?.nombre_usuario) return `@${message.sender.nombre_usuario}`;
    if (message.sender?.nombre) return message.sender.nombre;
    return 'Usuario';
  }

  public getCommunityInitials(community: ForumCommunity | null): string {
    if (!community?.name) return '?';

    return community.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  public formatDate(value?: string | null): string {
    if (!value) return '';

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private async uploadFiles(idCommunity: number): Promise<ForumAttachment[]> {
    const uploads: ForumAttachment[] = [];

    for (const file of this.selectedFiles()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileName = `forum_${idCommunity}_${Date.now()}_${safeName}`;
      const url = await this.imageService.subirImagen(file, 'imagenes', fileName);

      uploads.push({
        url,
        storage_path: `imagenes/${fileName}`,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
    }

    return uploads;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const element = this.messageScroller?.nativeElement;
      if (!element) return;

      element.scrollTop = element.scrollHeight;
    }, 80);
  }

  private getErrorText(error: any): string {
    const detail = error?.error?.detail || error?.error?.message || error?.message;
    if (!detail) return 'Ocurrió un error inesperado.';
    return typeof detail === 'string' ? detail : JSON.stringify(detail);
  }
}
