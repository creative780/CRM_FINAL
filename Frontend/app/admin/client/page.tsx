'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, Building2, Users } from 'lucide-react';
import DashboardNavbar from '@/app/components/navbar/DashboardNavbar';
import { clientsApi, Client, Organization, Contact } from '@/lib/clients';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showNewOrganizationFields, setShowNewOrganizationFields] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | ''>('');
  const [newOrganization, setNewOrganization] = useState({
    name: '',
    industry: '',
    website: '',
    notes: '',
  });
  const [showNewContactFields, setShowNewContactFields] = useState(false);
  const [primaryContactId, setPrimaryContactId] = useState<number | ''>('');
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
  });
  const [newClientStatus, setNewClientStatus] = useState('active');

  const resetAddClientForm = () => {
    setIsSubmitting(false);
    setFormError(null);
    setShowNewOrganizationFields(false);
    setSelectedOrganizationId('');
    setNewOrganization({
      name: '',
      industry: '',
      website: '',
      notes: '',
    });
    setShowNewContactFields(false);
    setPrimaryContactId('');
    setNewContact({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      title: '',
    });
    setNewClientStatus('active');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddClientOpen(open);
    if (!open) {
      resetAddClientForm();
    }
  };

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [clientsData, orgsData, contactsData] = await Promise.all([
          clientsApi.getClients(),
          clientsApi.getOrganizations(),
          clientsApi.getContacts(),
        ]);
        
        setClients(clientsData);
        setOrganizations(orgsData);
        setContacts(contactsData);
        
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleCreateClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      setIsSubmitting(true);

      let orgId: number | null = null;

      if (showNewOrganizationFields) {
        const trimmedName = newOrganization.name.trim();
        if (!trimmedName) {
          setFormError('Organization name is required');
          setIsSubmitting(false);
          return;
        }

        const createdOrg = await clientsApi.createOrganization({
          name: trimmedName,
          industry: newOrganization.industry.trim(),
          website: newOrganization.website.trim(),
          notes: newOrganization.notes.trim(),
        });
        setOrganizations((prev) => [...prev, createdOrg]);
        orgId = createdOrg.id;
      } else if (typeof selectedOrganizationId === 'number') {
        orgId = selectedOrganizationId;
      }

      if (!orgId) {
        setFormError('Please select or create an organization for the client.');
        setIsSubmitting(false);
        return;
      }

      let contactId: number | null = null;
      if (showNewContactFields) {
        const trimmedFirstName = newContact.first_name.trim();
        if (!trimmedFirstName) {
          setFormError('Contact first name is required');
          setIsSubmitting(false);
          return;
        }

        const createdContact = await clientsApi.createContact({
          org: orgId,
          first_name: trimmedFirstName,
          last_name: newContact.last_name.trim(),
          email: newContact.email.trim(),
          phone: newContact.phone.trim(),
          title: newContact.title.trim(),
        });
        setContacts((prev) => [...prev, createdContact]);
        contactId = createdContact.id;
      } else if (typeof primaryContactId === 'number') {
        contactId = primaryContactId;
      }

      const createdClient = await clientsApi.createClient({
        org: orgId,
        primary_contact: contactId,
        status: newClientStatus,
      });

      setClients((prev) => [createdClient, ...prev]);
      setIsAddClientOpen(false);
      resetAddClientForm();
    } catch (err) {
      console.error('Failed to create client:', err);
      const message = err instanceof Error ? err.message : 'Failed to create client';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const org = organizations.find(o => o.id === client.org);
    return org?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           client.status.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedOrgId = !showNewOrganizationFields && typeof selectedOrganizationId === 'number'
    ? selectedOrganizationId
    : null;
  const availableContacts = selectedOrgId
    ? contacts.filter((contact) => contact.org === selectedOrgId)
    : [];
  const canSelectExistingContact = Boolean(selectedOrgId) && !showNewContactFields;

  if (loading) {
    return (
      <div className="space-y-6 px-4 md:px-8 lg:px-12 py-6">
        <DashboardNavbar />
        <div className="text-center py-12">
          <div className="text-gray-600">Loading clients...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 px-4 md:px-8 lg:px-12 py-6">
        <DashboardNavbar />
        <div className="text-center py-12">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-8 lg:px-12 py-6">
      <DashboardNavbar />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-600">Manage your client relationships and accounts</p>
        </div>
        <Button onClick={() => setIsAddClientOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-xs text-muted-foreground">Companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Badge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground">All contacts</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const org = organizations.find(o => o.id === client.org);
          const primaryContact = contacts.find(c => c.id === client.primary_contact);

          return (
            <Card key={client.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>{org?.name || 'Unknown Organization'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Status: </span>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </div>
                  {primaryContact && (
                    <div>
                      <span className="text-sm font-medium">Contact: </span>
                      <span className="text-sm">{primaryContact.first_name} {primaryContact.last_name}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium">Created: </span>
                    <span className="text-sm">{new Date(client.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isAddClientOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>
              Create a new client by selecting or creating an organization and optional primary contact.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClient} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="organization">Organization</Label>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-sm"
                  onClick={() => {
                    const next = !showNewOrganizationFields;
                    setShowNewOrganizationFields(next);
                    setFormError(null);
                    if (next) {
                      setSelectedOrganizationId('');
                    } else {
                      setNewOrganization({
                        name: '',
                        industry: '',
                        website: '',
                        notes: '',
                      });
                    }
                  }}
                >
                  {showNewOrganizationFields ? 'Select existing organization' : 'Create new organization'}
                </Button>
              </div>

              {showNewOrganizationFields ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="org-name">Organization Name *</Label>
                    <Input
                      id="org-name"
                      value={newOrganization.name}
                      onChange={(event) =>
                        setNewOrganization((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-industry">Industry</Label>
                    <Input
                      id="org-industry"
                      value={newOrganization.industry}
                      onChange={(event) =>
                        setNewOrganization((prev) => ({ ...prev, industry: event.target.value }))
                      }
                      placeholder="Manufacturing"
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-website">Website</Label>
                    <Input
                      id="org-website"
                      value={newOrganization.website}
                      onChange={(event) =>
                        setNewOrganization((prev) => ({ ...prev, website: event.target.value }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="org-notes">Notes</Label>
                    <Textarea
                      id="org-notes"
                      value={newOrganization.notes}
                      onChange={(event) =>
                        setNewOrganization((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder="Additional context about the organization"
                    />
                  </div>
                </div>
              ) : (
                <select
                  id="organization"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={typeof selectedOrganizationId === 'number' ? selectedOrganizationId : ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedOrganizationId(value ? Number(value) : '');
                    setPrimaryContactId('');
                    setShowNewContactFields(false);
                  }}
                >
                  <option value="" disabled>
                    Select an organization
                  </option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="primary-contact">Primary Contact</Label>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-sm"
                  onClick={() => {
                    const next = !showNewContactFields;
                    setShowNewContactFields(next);
                    setFormError(null);
                    if (next) {
                      setPrimaryContactId('');
                    } else {
                      setNewContact({
                        first_name: '',
                        last_name: '',
                        email: '',
                        phone: '',
                        title: '',
                      });
                    }
                  }}
                >
                  {showNewContactFields ? 'Select existing contact' : 'Create new contact'}
                </Button>
              </div>

              {showNewContactFields ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact-first-name">First Name *</Label>
                    <Input
                      id="contact-first-name"
                      value={newContact.first_name}
                      onChange={(event) =>
                        setNewContact((prev) => ({ ...prev, first_name: event.target.value }))
                      }
                      placeholder="Jane"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-last-name">Last Name</Label>
                    <Input
                      id="contact-last-name"
                      value={newContact.last_name}
                      onChange={(event) =>
                        setNewContact((prev) => ({ ...prev, last_name: event.target.value }))
                      }
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={newContact.email}
                      onChange={(event) =>
                        setNewContact((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="jane.doe@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input
                      id="contact-phone"
                      value={newContact.phone}
                      onChange={(event) =>
                        setNewContact((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="contact-title">Job Title</Label>
                    <Input
                      id="contact-title"
                      value={newContact.title}
                      onChange={(event) =>
                        setNewContact((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Head of Procurement"
                    />
                  </div>
                </div>
              ) : (
                <select
                  id="primary-contact"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={typeof primaryContactId === 'number' ? primaryContactId : ''}
                  onChange={(event) =>
                    setPrimaryContactId(event.target.value ? Number(event.target.value) : '')
                  }
                  disabled={!canSelectExistingContact}
                >
                  <option value="">
                    {canSelectExistingContact ? 'No primary contact' : 'Select an organization first'}
                  </option>
                  {availableContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-status">Status</Label>
              <select
                id="client-status"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newClientStatus}
                onChange={(event) => setNewClientStatus(event.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {formError && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}