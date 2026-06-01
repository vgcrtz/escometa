import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatbotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotFuente {
  titulo?: string | null;
  url?: string | null;
  tipo: string;
}

export interface ChatbotData {
  respuesta: string;
  fuentes: ChatbotFuente[];
  modelo?: string | null;
  uso_internet: boolean;
}

export interface ChatbotApiResponse {
  status: string;
  message?: string;
  data: ChatbotData;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private baseURL = 'http://localhost:8000';

  preguntar(
    pregunta: string,
    historial: ChatbotMessage[] = [],
    usarInternet = true,
  ): Observable<ChatbotApiResponse> {
    return this.http.post<ChatbotApiResponse>(
      `${this.baseURL}/chatbot/preguntar`,
      {
        pregunta,
        historial,
        usar_internet: usarInternet,
      },
      { withCredentials: true },
    );
  }
}
