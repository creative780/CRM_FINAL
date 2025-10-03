import { api } from './api';

export interface OrderItem {
  product_id?: string;
  name: string;
  quantity: number;
  attributes?: Record<string, string>;
  sku?: string;
  imageUrl?: string;
  customRequirements?: string;
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
  order_id?: number;
  order_code: string;
  client_name: string;
  company_name?: string;
  phone?: string;
  trn?: string;
  email?: string;
  address?: string;
  specs: string;
  urgency: string;
  status: string;
  stage: string;
  items?: OrderItem[];
  quotation?: OrderQuotation;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  assigned_sales_person?: string;
  assigned_designer?: string;
  assigned_production_person?: string;
  design_stage?: any;
  printing_stage?: any;
  delivery_stage?: any;
  design_approvals?: any[];
  machine_assignments?: any[];
  pricing_status?: string;
}

export interface OrderQuotation {
  labour_cost: number;
  finishing_cost: number;
  paper_cost: number;
  machine_cost: number;
  design_cost: number;
  delivery_cost: number;
  other_charges: number;
  discount: number;
  advance_paid: number;
  quotation_notes?: string;
  custom_field?: string;
  products_subtotal: number;
  other_subtotal: number;
  subtotal: number;
  vat_3pct: number;
  grand_total: number;
  remaining: number;
  sales_person?: string;
  trn?: string;
}

export interface OrderDesign {
  order: number;
  assigned_designer: string;
  requirements_files: string[];
  design_status: string;
}

export interface OrderPrint {
  order: number;
  print_operator: string;
  print_time: string | null;
  batch_info: string;
  print_status: string;
  qa_checklist: string[];
}

export interface OrderApproval {
  order: number;
  client_approval_files: string[];
  approved_at: string | null;
}

export interface OrderDelivery {
  order: number;
  delivery_code: string;
  delivery_status: string;
  delivered_at: string | null;
  rider_photo_path: string;
}

export interface OrderCreatePayload {
  clientName: string;
  specs?: string;
  urgency?: string;
  items?: OrderItem[];
}

export const ordersApi = {
  // Orders CRUD
  getOrders: (): Promise<Order[]> =>
    api.get('/api/orders/'),

  createOrder: (data: OrderCreatePayload): Promise<Order> =>
    api.post('/api/orders/', data),
  
  getOrder: (id: number): Promise<Order> => 
    api.get(`/api/orders/${id}/`),
  
  updateOrder: (id: number, data: Partial<Order>): Promise<Order> => 
    api.patch(`/api/orders/${id}/`, data),
  
  deleteOrder: (id: number): Promise<void> => 
    api.delete(`/api/orders/${id}/`),
  
  // Quotation operations
  getQuotation: async (orderId: number): Promise<OrderQuotation> => {
    console.log('=== GET QUOTATION API CALL ===');
    console.log('Order ID:', orderId);
    console.log('URL:', `/api/orders/${orderId}/quotation/`);
    const response = await api.get(`/api/orders/${orderId}/quotation/`);
    console.log('Raw response:', response);
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response));
    console.log('Response.ok:', response.ok);
    console.log('Response.data:', response.data);
    console.log('Response.data type:', typeof response.data);
    console.log('Response.data keys:', response.data ? Object.keys(response.data) : 'undefined');
    
    // Backend returns {ok: true, data: {...}}, extract the data
    const result = response.data;
    console.log('Final result:', result);
    console.log('Final result type:', typeof result);
    console.log('Final result keys:', result ? Object.keys(result) : 'undefined');
    console.log('Final result labour_cost:', result?.labour_cost);
    console.log('Final result stringified:', JSON.stringify(result, null, 2));
    return response.data;
  },
  
  updateQuotation: async (orderId: number, data: Partial<OrderQuotation>): Promise<OrderQuotation> => {
    console.log('=== UPDATE QUOTATION API CALL ===');
    console.log('Order ID:', orderId);
    console.log('Data to send:', data);
    console.log('URL:', `/api/orders/${orderId}/quotation/`);
    const response = await api.patch(`/api/orders/${orderId}/quotation/`, data);
    console.log('Raw response:', response);
    // Backend returns {ok: true, data: {...}}, extract the data
    const result = response.data;
    console.log('Extracted data:', result);
    return result;
  },

  // Order Design
  getDesign: (orderId: number): Promise<OrderDesign> => 
    api.get(`/api/orders/${orderId}/design/`),
  
  updateDesign: (orderId: number, data: Partial<OrderDesign>): Promise<void> => 
    api.patch(`/api/orders/${orderId}/design/`, data),

  // Order Print
  getPrint: (orderId: number): Promise<OrderPrint> => 
    api.get(`/api/orders/${orderId}/print/`),
  
  updatePrint: (orderId: number, data: Partial<OrderPrint>): Promise<void> => 
    api.patch(`/api/orders/${orderId}/print/`, data),

  // Order Approval
  getApproval: (orderId: number): Promise<OrderApproval> => 
    api.get(`/api/orders/${orderId}/approval/`),
  
  updateApproval: (orderId: number, data: Partial<OrderApproval>): Promise<void> => 
    api.patch(`/api/orders/${orderId}/approval/`, data),

  // Order Delivery
  getDelivery: (orderId: number): Promise<OrderDelivery> => 
    api.get(`/api/orders/${orderId}/delivery/`),
  
  updateDelivery: (orderId: number, data: Partial<OrderDelivery>): Promise<void> => 
    api.patch(`/api/orders/${orderId}/delivery/`, data),

  // Actions
  markPrinted: (orderId: number, sku: string, qty: number): Promise<void> =>
    api.post(`/api/orders/${orderId}/actions/mark-printed`, { sku, qty }),
};
