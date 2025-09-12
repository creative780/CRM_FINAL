import { api } from './api';

export interface DashboardKPIs {
  leads: {
    total: number;
    new_today: number;
    won_this_month: number;
    growth_rate: number;
  };
  orders: {
    total: number;
    this_month: number;
    growth_rate: number;
  };
  revenue: {
    this_month: number;
    growth_rate: number;
  };
  employees: {
    total: number;
    active: number;
  };
}

export interface RecentActivity {
  leads: Array<{
    id: number;
    title: string;
    stage: string;
    value: number;
    created_at: string;
    owner: string | null;
    org_name: string | null;
  }>;
  orders: Array<{
    id: number;
    title: string;
    stage: string;
    status: string;
    created_at: string;
    client_name: string | null;
  }>;
  clients: Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
    account_owner: string | null;
  }>;
}

export const dashboardApi = {
  getKPIs: (): Promise<DashboardKPIs> => 
    api.get('/api/dashboard/kpis/'),
  
  getRecentActivity: (): Promise<RecentActivity> => 
    api.get('/api/dashboard/recent-activity/'),
};
