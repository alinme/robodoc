import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { Message } from '@/types/message';

const API_BASE = '/api';

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<Message[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const template = ref('Hello {GivenName}, this is a message from me. Please reply when you can.');

  // Fetch message history
  async function fetchHistory(contactId?: number, groupId?: number, status?: string, limit = 100, offset = 0) {
    loading.value = true;
    error.value = null;
    try {
      const params: any = { limit, offset };
      if (contactId) params.contactId = contactId;
      if (groupId) params.groupId = groupId;
      if (status) params.status = status;

      const response = await axios.get(`${API_BASE}/messages/history`, { params });
      messages.value = response.data.messages;
      total.value = response.data.total;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      console.error('Error fetching message history:', err);
    } finally {
      loading.value = false;
    }
  }

  // Send messages
  async function sendMessages(contactIds: number[], groupId: number | null, messageTemplate: string, delay = 1000) {
    loading.value = true;
    error.value = null;
    try {
      const payload: any = {
        template: messageTemplate,
        delay
      };
      
      if (contactIds.length > 0) {
        payload.contactIds = contactIds;
      } else if (groupId) {
        payload.groupId = groupId;
      }

      const response = await axios.post(`${API_BASE}/messages/send`, payload);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Retry failed message
  async function retryMessage(messageId: number) {
    try {
      const response = await axios.post(`${API_BASE}/messages/retry/${messageId}`);
      await fetchHistory();
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Set template
  function setTemplate(newTemplate: string) {
    template.value = newTemplate;
  }

  return {
    messages,
    loading,
    error,
    total,
    template,
    fetchHistory,
    sendMessages,
    retryMessage,
    setTemplate
  };
});

