import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { Group } from '@/types/contact';

const API_BASE = '/api';

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Group[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch all groups
  async function fetchGroups() {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_BASE}/groups`);
      groups.value = response.data.groups;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      console.error('Error fetching groups:', err);
    } finally {
      loading.value = false;
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

  // Update group
  async function updateGroup(id: number, data: Partial<Group>) {
    try {
      const response = await axios.put(`${API_BASE}/groups/${id}`, data);
      await fetchGroups();
      return response.data.group;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Delete group
  async function deleteGroup(id: number) {
    try {
      await axios.delete(`${API_BASE}/groups/${id}`);
      await fetchGroups();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  return {
    groups,
    loading,
    error,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup
  };
});

