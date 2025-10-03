import { api } from "./api";

export interface HREmployeeOption {
  id: number;
  name: string;
  salary: number;
  designation?: string;
  email?: string;
  phone?: string;
  image?: string;
}

export const hrApi = {
  async getEmployees(): Promise<HREmployeeOption[]> {
    const res = await api.get<any>("/api/hr/employees");
    // backend returns array directly
    return Array.isArray(res) ? res : (res?.employees ?? []);
  },
};

