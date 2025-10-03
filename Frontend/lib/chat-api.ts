/**
 * API client for chat functionality
 */

export interface BotPrompt {
  id: number;
  title: string;
  text: string;
  order: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  type: 'user' | 'bot' | 'system';
  text: string;
  sender?: string;
  sender_name?: string;
  created_at: string;
  attachment?: string;
  rich?: any;
}

export interface Conversation {
  id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  participants: Array<{
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    joined_at: string;
    last_read_at?: string;
  }>;
  last_message?: {
    id: string;
    text: string;
    type: string;
    sender?: string;
    created_at: string;
  };
  participant_count: number;
}

export interface UserResponse {
  conversation_id: string;
  message_id: string;
}

export interface BotResponse {
  message: string;
}

export class ChatAPI {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token') || 
             localStorage.getItem('auth_token') ||
             this.getCookie('access_token') ||
             this.getCookie('auth_token');
    }
    return null;
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  // Bot interaction endpoints (matching frontend expectations)
  async submitUserMessage(message: string, conversationId?: string): Promise<UserResponse> {
    return this.request<UserResponse>('/user-response/', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
  }

  async getBotResponse(conversationId: string): Promise<BotResponse> {
    return this.request<BotResponse>('/bot-response/', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
      }),
    });
  }

  async getBotPrompts(): Promise<BotPrompt[]> {
    return this.request<BotPrompt[]>('/bot-prompts/');
  }

  // Conversation management
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/chat/conversations/');
  }

  async createConversation(title?: string): Promise<Conversation> {
    return this.request<Conversation>('/chat/conversations/', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.request<Conversation>(`/chat/conversations/${conversationId}/`);
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return this.request<ChatMessage[]>(`/chat/conversations/${conversationId}/messages/?${params}`);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await this.request(`/chat/messages/${messageId}/read/`, {
      method: 'POST',
    });
  }

  async uploadAttachment(file: File): Promise<{
    attachment_id: string;
    file_url: string;
    file_name: string;
    file_size: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/chat/upload/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Create a singleton instance
export const chatAPI = new ChatAPI();
