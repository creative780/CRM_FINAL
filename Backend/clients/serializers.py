from rest_framework import serializers
from .models import Organization, Contact, Lead, Client


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'industry', 'website', 'notes']


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'org', 'first_name', 'last_name', 'email', 'phone', 'title']


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ['id', 'org', 'contact', 'title', 'source', 'stage', 'owner', 'value', 'probability', 'notes', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'org', 'primary_contact', 'account_owner', 'status', 'created_at']
        read_only_fields = ['created_at']

