import { api } from './api';

export interface Organization {
  id: number;
  name: string;
  industry: string;
  website: string;
  notes: string;
}

export interface Contact {
  id: number;
  org: number | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  title: string;
}

export interface Lead {
  id: number;
  org: number | null;
  contact: number | null;
  title: string;
  source: string;
  stage: 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
  owner: number | null;
  value: number;
  probability: number;
  notes: string;
  created_by: number | null;
  created_at: string;
}

export interface Client {
  id: number;
  org: number;
  primary_contact: number | null;
  account_owner: number | null;
  status: string;
  created_at: string;
}

export const clientsApi = {
  // Organizations
  getOrganizations: (): Promise<Organization[]> => 
    api.get('/api/organizations/'),
  
  createOrganization: (data: Partial<Organization>): Promise<Organization> => 
    api.post('/api/organizations/', data),
  
  updateOrganization: (id: number, data: Partial<Organization>): Promise<Organization> => 
    api.patch(`/api/organizations/${id}/`, data),
  
  deleteOrganization: (id: number): Promise<void> => 
    api.delete(`/api/organizations/${id}/`),

  // Contacts
  getContacts: (): Promise<Contact[]> => 
    api.get('/api/contacts/'),
  
  createContact: (data: Partial<Contact>): Promise<Contact> => 
    api.post('/api/contacts/', data),
  
  updateContact: (id: number, data: Partial<Contact>): Promise<Contact> => 
    api.patch(`/api/contacts/${id}/`, data),
  
  deleteContact: (id: number): Promise<void> => 
    api.delete(`/api/contacts/${id}/`),

  // Leads
  getLeads: (): Promise<Lead[]> => 
    api.get('/api/leads/'),
  
  createLead: (data: Partial<Lead>): Promise<Lead> => 
    api.post('/api/leads/', data),
  
  updateLead: (id: number, data: Partial<Lead>): Promise<Lead> => 
    api.patch(`/api/leads/${id}/`, data),
  
  deleteLead: (id: number): Promise<void> => 
    api.delete(`/api/leads/${id}/`),
  
  convertLead: (id: number): Promise<Client> => 
    api.post(`/api/leads/${id}/convert/`),

  // Clients
  getClients: (): Promise<Client[]> => 
    api.get('/api/clients/'),
  
  createClient: (data: Partial<Client>): Promise<Client> => 
    api.post('/api/clients/', data),
  
  updateClient: (id: number, data: Partial<Client>): Promise<Client> => 
    api.patch(`/api/clients/${id}/`, data),
  
  deleteClient: (id: number): Promise<void> => 
    api.delete(`/api/clients/${id}/`),
};
