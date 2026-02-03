import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { MessageTemplate } from '@/types/template';

const API_BASE = '/api';

export const useTemplatesStore = defineStore('templates', () => {
  const templates = ref<MessageTemplate[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch all templates
  async function fetchTemplates() {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_BASE}/templates`);
      templates.value = response.data.templates;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      console.error('Error fetching templates:', err);
    } finally {
      loading.value = false;
    }
  }

  // Create template
  async function createTemplate(name: string, content: string, html_template?: string, email_subject?: string) {
    try {
      const response = await axios.post(`${API_BASE}/templates`, { name, content, html_template, email_subject });
      await fetchTemplates();
      return response.data.template;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Update template
  async function updateTemplate(id: number, name: string, content: string, html_template?: string, email_subject?: string) {
    try {
      const response = await axios.put(`${API_BASE}/templates/${id}`, { name, content, html_template, email_subject });
      await fetchTemplates();
      return response.data.template;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Delete template
  async function deleteTemplate(id: number) {
    try {
      await axios.delete(`${API_BASE}/templates/${id}`);
      await fetchTemplates();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Get template by ID
  async function getTemplate(id: number) {
    try {
      const response = await axios.get(`${API_BASE}/templates/${id}`);
      return response.data.template;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate
  };
});

