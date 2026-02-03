import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { CallRecord } from '@/types/call';

const API_BASE = '/api';

export const useCallsStore = defineStore('calls', () => {
  const records = ref<CallRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);

  const filters = ref({
    groupId: null as number | null,
    search: '',
    limit: 100,
    offset: 0
  });

  async function fetchRecords(params?: { limit?: number; offset?: number }) {
    loading.value = true;
    error.value = null;
    try {
      const limit = params?.limit ?? filters.value.limit;
      const offset = params?.offset ?? filters.value.offset;

      const query: Record<string, any> = { limit, offset };
      if (filters.value.groupId) query.groupId = filters.value.groupId;
      if (filters.value.search) query.search = filters.value.search;

      const response = await axios.get(`${API_BASE}/calls`, { params: query });
      records.value = (response.data.records || []).map((record: CallRecord) => ({
        ...record,
        call_count: Number(record.call_count ?? 0),
        observations: record.observations ?? null,
        last_called_at: record.last_called_at ?? null,
        last_call_type: (record.last_call_type ?? null) as 'phone' | 'whatsapp' | null
      }));
      total.value = response.data.total;
      filters.value.limit = response.data.limit ?? limit;
      filters.value.offset = response.data.offset ?? offset;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      console.error('Error fetching call records:', err);
    } finally {
      loading.value = false;
    }
  }

  async function recordCall(contactId: number, callType: 'phone' | 'whatsapp', observations?: string | null) {
    try {
      const response = await axios.post(`${API_BASE}/calls/${contactId}/call`, {
        callType,
        observations: observations ?? null
      });

      updateRecordInState({
        ...response.data.record,
        call_count: Number(response.data.record?.call_count ?? 0)
      });
      return response.data.record as CallRecord;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  async function updateCallDetails(
    contactId: number,
    payload: { callCount?: number; observations?: string | null }
  ) {
    try {
      const response = await axios.patch(`${API_BASE}/calls/${contactId}`, payload);
      updateRecordInState({
        ...response.data.record,
        call_count: Number(response.data.record?.call_count ?? 0)
      });
      return response.data.record as CallRecord;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  function updateRecordInState(record: CallRecord | null) {
    if (!record) return;
    const index = records.value.findIndex(r => r.contact_id === record.contact_id);
    if (index === -1) {
      records.value.push(record);
    } else {
      records.value[index] = record;
    }
  }

  function setFilters(newFilters: Partial<typeof filters.value>) {
    filters.value = { ...filters.value, ...newFilters };
  }

  return {
    records,
    loading,
    error,
    total,
    filters,
    fetchRecords,
    recordCall,
    updateCallDetails,
    setFilters
  };
});


