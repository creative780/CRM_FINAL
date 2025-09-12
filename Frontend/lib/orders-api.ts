import { api } from './api';

export interface Order {
  id: number;
  order_id: string;
  client_name: string;
  product_type: string;
  specs: string;
  urgency: string;
  status: string;
  stage: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderQuotation {
  order: number;
  labour_cost: number;
  finishing_cost: number;
  paper_cost: number;
  design_cost: number;
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
  delivered_at: string | null;
  rider_photo_path: string;
}

export const ordersApi = {
  // Orders CRUD
  getOrders: (): Promise<Order[]> => 
    api.get('/api/orders/'),
  
  createOrder: (data: Partial<Order>): Promise<Order> => 
    api.post('/api/orders', data),
  
  getOrder: (id: number): Promise<Order> => 
    api.get(`/api/orders/${id}/`),
  
  updateOrder: (id: number, data: Partial<Order>): Promise<Order> => 
    api.patch(`/api/orders/${id}/`, data),
  
  deleteOrder: (id: number): Promise<void> => 
    api.delete(`/api/orders/${id}/`),

  // Order Stage Management
  updateOrderStage: (id: number, stage: string, payload: any): Promise<void> => 
    api.patch(`/api/orders/${id}`, { stage, payload }),

  // Order Quotation
  getQuotation: (orderId: number): Promise<OrderQuotation> => 
    api.get(`/api/orders/${orderId}/quotation/`),
  
  updateQuotation: (orderId: number, data: Partial<OrderQuotation>): Promise<void> => 
    api.patch(`/api/orders/${orderId}/quotation/`, data),

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
    api.post(`/api/orders/${orderId}/actions/mark-printed/`, { sku, qty }),
};
