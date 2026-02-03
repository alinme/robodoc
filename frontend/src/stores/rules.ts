import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { Rule } from '@/types/rule';

const API_BASE = '/api';

export const useRulesStore = defineStore('rules', () => {
  const rules = ref<Rule[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch all rules
  async function fetchRules() {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_BASE}/rules`);
      rules.value = response.data.rules;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      console.error('Error fetching rules:', err);
    } finally {
      loading.value = false;
    }
  }

  // Create rule
  async function createRule(ruleData: Partial<Rule>) {
    try {
      const response = await axios.post(`${API_BASE}/rules`, ruleData);
      await fetchRules();
      return response.data.rule;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Update rule
  async function updateRule(id: number, ruleData: Partial<Rule>) {
    try {
      const response = await axios.put(`${API_BASE}/rules/${id}`, ruleData);
      await fetchRules();
      return response.data.rule;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Delete rule
  async function deleteRule(id: number) {
    try {
      await axios.delete(`${API_BASE}/rules/${id}`);
      await fetchRules();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Get active rules
  const activeRules = ref<Rule[]>([]);
  function getActiveRules() {
    activeRules.value = rules.value.filter(r => r.is_active);
    return activeRules.value;
  }

  return {
    rules,
    activeRules,
    loading,
    error,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    getActiveRules
  };
});

