import { api } from "./api";
import type { Notification } from "@/types/api";

export const notificationsApi = {
  async list(status?: 'unread' | 'read'): Promise<Notification[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await api.get<any>(`/api/notifications${q}`);
    return Array.isArray(res) ? res : (res?.results ?? []);
  },
  async markRead(id: number): Promise<void> {
    await api.patch(`/api/notifications/${id}`, { status: 'read' });
  },
};

