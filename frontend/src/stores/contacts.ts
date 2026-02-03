import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { Contact, Group } from '@/types/contact';

const API_BASE = '/api';

export const useContactsStore = defineStore('contacts', () => {
  const contacts = ref<Contact[]>([]);
  const groups = ref<Group[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const filters = ref({
    groupId: null as number | null,
    business: '',
    search: ''
  });

  // Fetch all contacts
  async function fetchContacts(limit = 100, offset = 0) {
    loading.value = true;
    error.value = null;
    try {
      const params: any = { limit, offset };
      if (filters.value.groupId) params.groupId = filters.value.groupId;
      if (filters.value.business) params.business = filters.value.business;
      if (filters.value.search) params.search = filters.value.search;

      const response = await axios.get(`${API_BASE}/contacts`, { params });
      contacts.value = response.data.contacts;
      total.value = response.data.total;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      console.error('Error fetching contacts:', err);
    } finally {
      loading.value = false;
    }
  }

  // Fetch all groups
  async function fetchGroups() {
    try {
      const response = await axios.get(`${API_BASE}/groups`);
      groups.value = response.data.groups;
    } catch (err: any) {
      console.error('Error fetching groups:', err);
    }
  }

  // Create group
  async function createGroup(name: string, description?: string) {
    try {
      const response = await axios.post(`${API_BASE}/groups`, { name, description });
      await fetchGroups();
      return response.data.group;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Update contact
  async function updateContact(id: number, data: Partial<Contact>) {
    try {
      const response = await axios.put(`${API_BASE}/contacts/${id}`, data);
      const index = contacts.value.findIndex(c => c.id === id);
      if (index !== -1) {
        contacts.value[index] = response.data.contact;
      }
      return response.data.contact;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Delete contact
  async function deleteContact(id: number) {
    try {
      await axios.delete(`${API_BASE}/contacts/${id}`);
      contacts.value = contacts.value.filter(c => c.id !== id);
      total.value--;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Delete all contacts
  async function deleteAllContacts() {
    try {
      const response = await axios.delete(`${API_BASE}/contacts/all`);
      contacts.value = [];
      total.value = 0;
      return response.data.deleted;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Delete selected contacts (bulk delete)
  async function deleteContacts(contactIds: number[]) {
    try {
      const response = await axios.delete(`${API_BASE}/contacts/bulk`, {
        data: { contactIds }
      });
      contacts.value = contacts.value.filter(c => !contactIds.includes(c.id));
      total.value -= response.data.deleted;
      return response.data.deleted;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Set filters
  function setFilters(newFilters: Partial<typeof filters.value>) {
    filters.value = { ...filters.value, ...newFilters };
  }

  // Computed
  const filteredContacts = computed(() => contacts.value);

  return {
    contacts,
    groups,
    loading,
    error,
    total,
    filters,
    filteredContacts,
    fetchContacts,
    fetchGroups,
    createGroup,
    updateContact,
    deleteContact,
    deleteAllContacts,
    deleteContacts,
    setFilters
  };
});

