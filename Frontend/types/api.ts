export type Role = "admin" | "sales" | "designer" | "production" | "delivery" | "finance";

export interface UserInfo {
  username: string;
  role: Role;
  token: string;
}

export interface DailySummary {
  date: string;
  keystrokes: number;
  clicks: number;
  active_minutes?: number;
  idle_minutes?: number;
  productivity: number;
}

export interface EmployeeActivity {
  id: number | string;
  name: string;
  email: string;
  department: string;
  status: "online" | "idle" | "offline" | string;
  keystrokeCount: number;
  mouseClicks: number;
  activityTimeline: number[] | string[];
  screenshots: string[];
  videos?: string[];
  dailySummary: DailySummary[];
}

export interface InventoryItem {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface OrderItem {
  product_id?: string;
  name: string;
  quantity: number;
  attributes?: Record<string, string>;
  sku?: string;
  design_ready?: boolean;
  design_need_custom?: boolean;
  design_files_manifest?: Array<{
    name: string;
    size: number;
    type: string;
    url?: string;
  }>;
}

export interface Order {
  id: number;
  order_id: string;
  client_name: string;
  specs?: string;
  urgency?: string;
  status: string;
  stage: string;
  items?: OrderItem[];
}

export interface OrderQuotationPayload { labour_cost?: number; finishing_cost?: number; paper_cost?: number; design_cost?: number; }
export interface OrderDesignPayload { assigned_designer?: string; requirements_files?: string[]; design_status?: string; }
export interface OrderPrintPayload { print_operator?: string; print_time?: string; batch_info?: string; print_status?: string; qa_checklist?: string[]; }
export interface OrderApprovalPayload { client_approval_files?: string[]; approved_at?: string; }
export interface OrderDeliveryPayload { delivery_code?: string; delivered_at?: string; rider_photo_path?: string; delivery_status?: string; }

export type OrderStagePayloads =
  | { stage: "quotation"; payload: OrderQuotationPayload }
  | { stage: "design"; payload: OrderDesignPayload }
  | { stage: "printing"; payload: OrderPrintPayload }
  | { stage: "approval"; payload: OrderApprovalPayload }
  | { stage: "delivery"; payload: OrderDeliveryPayload };

export interface Notification {
  id: number;
  status: "unread" | "read";
  message: string;
  created_at: string;
}
