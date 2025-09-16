from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Organization, Contact, Lead, Client
from .serializers import OrganizationSerializer, ContactSerializer, LeadSerializer, ClientSerializer
from accounts.permissions import RolePermission


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by('name')
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'industry']


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all().order_by('first_name')
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone']


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related('org', 'contact', 'owner').all().order_by('-created_at')
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['stage', 'owner']
    search_fields = ['title', 'notes', 'source']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        lead = self.get_object()
        if not lead.org:
            return Response({'detail': 'Lead has no organization'}, status=400)
        client, _ = Client.objects.get_or_create(org=lead.org, defaults={
            'primary_contact': lead.contact,
            'account_owner': lead.owner or request.user,
        })
        lead.stage = 'won'
        lead.save(update_fields=['stage'])
        return Response(ClientSerializer(client).data)


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.select_related('org', 'primary_contact', 'account_owner').all().order_by('-created_at')
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['org__name', 'status']

    def perform_create(self, serializer):
        if 'account_owner' not in serializer.validated_data:
            serializer.save(account_owner=self.request.user)
        else:
            serializer.save()

# Create your views here.
