<template>
  <div class="px-4 py-6 sm:px-0 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold text-gray-900">Centralizator Records</h2>
        <p class="mt-1 text-sm text-gray-500">
          All imported centralizator records across every sheet.
        </p>
      </div>
      <router-link
        to="/upload"
        class="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 cursor-pointer"
      >
        Import Centralizator
      </router-link>
    </div>

    <div class="bg-white shadow rounded-lg p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Live search</label>
        <input
          v-model.trim="searchQuery"
          type="text"
          placeholder="Search by school, address, state/region, protocol #..."
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <p class="text-xs text-gray-500 mt-2">
          {{ total }} record(s) found.
        </p>
      </div>

      <div class="border-t border-gray-200 pt-4 space-y-3">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Export columns</label>
            <p class="text-xs text-gray-500">
              Base columns always included. Select extra columns from JSON.
            </p>
          </div>
          <button
            type="button"
            @click="showExportColumns = !showExportColumns"
            class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 cursor-pointer"
          >
            {{ showExportColumns ? 'Hide' : 'Show' }} export columns
          </button>
        </div>

        <div v-if="showExportColumns" class="space-y-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div class="flex gap-2">
              <button
                type="button"
                @click="toggleAllColumns(true)"
                class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Select all
              </button>
              <button
                type="button"
                @click="toggleAllColumns(false)"
                class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Clear
              </button>
            </div>
            <button
              type="button"
              @click="exportCsv"
              :disabled="exporting"
              class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ exporting ? 'Exporting...' : 'Export CSV' }}
            </button>
          </div>

          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <input
              v-model.trim="columnSearch"
              type="text"
              placeholder="Search JSON columns..."
              class="w-full md:max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div class="border border-gray-200 rounded-md max-h-48 overflow-auto bg-white">
            <div v-if="loadingColumns" class="px-4 py-3 text-sm text-gray-500">
              Loading columns...
            </div>
            <div v-else-if="filteredColumns.length === 0" class="px-4 py-3 text-sm text-gray-500">
              No JSON columns found.
            </div>
            <label
              v-else
              v-for="column in filteredColumns"
              :key="column"
              class="flex items-center gap-2 px-4 py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                :value="column"
                v-model="selectedColumns"
              />
              <span class="text-sm text-gray-700 truncate" :title="column">
                {{ column }}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div v-if="loading" class="p-6 text-sm text-gray-600 flex items-center gap-2">
        <span class="h-4 w-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
        Loading records...
      </div>

      <div v-else-if="errorMessage" class="p-6 text-sm text-red-600">
        {{ errorMessage }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State/Region</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protocol #</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="record in records" :key="record.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ record.name }}</td>
              <td class="px-4 py-3 text-gray-700">{{ record.address || '-' }}</td>
              <td class="px-4 py-3 text-gray-700">{{ record.state_region }}</td>
              <td class="px-4 py-3 text-gray-700">{{ record.protocol_number || '-' }}</td>
              <td class="px-4 py-3 text-gray-500">{{ formatDate(record.updated_at || record.created_at) }}</td>
            </tr>
            <tr v-if="records.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-sm text-gray-500">
                No records found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > 0" class="px-6 py-4 border-t border-gray-200">
        <div class="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-700">
          <div class="flex items-center gap-3">
            <span>Showing {{ startRecord }} to {{ endRecord }} of {{ total }}</span>
            <label class="flex items-center gap-2">
              <span>Show:</span>
              <select
                v-model.number="pageSize"
                class="border border-gray-300 rounded-md px-2 py-1 text-sm cursor-pointer"
              >
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </label>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="goPrevious"
              :disabled="currentPage === 1"
              class="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <button
              @click="goNext"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';

const searchQuery = ref('');
const columnSearch = ref('');
const records = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const pageSize = ref(50);
const currentPage = ref(1);
const exporting = ref(false);
const showExportColumns = ref(false);
const availableColumns = ref<string[]>([]);
const selectedColumns = ref<string[]>([]);
const loadingColumns = ref(false);
let searchTimer: number | null = null;

onMounted(async () => {
  await fetchRecords();
  await fetchColumns();
});

watch(searchQuery, () => {
  currentPage.value = 1;
  if (searchTimer) {
    window.clearTimeout(searchTimer);
  }
  searchTimer = window.setTimeout(() => {
    fetchRecords();
    fetchColumns();
  }, 250);
});

watch(pageSize, () => {
  currentPage.value = 1;
  fetchRecords();
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(total.value / pageSize.value));
});

const startRecord = computed(() => {
  if (total.value === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const endRecord = computed(() => {
  return Math.min(currentPage.value * pageSize.value, total.value);
});

const filteredColumns = computed(() => {
  if (!columnSearch.value.trim()) return availableColumns.value;
  const query = columnSearch.value.trim().toLowerCase();
  return availableColumns.value.filter(column => column.toLowerCase().includes(query));
});

async function fetchRecords() {
  loading.value = true;
  errorMessage.value = null;

  try {
    const { data } = await axios.get('/api/centralizator', {
      params: {
        search: searchQuery.value || undefined,
        limit: pageSize.value,
        offset: (currentPage.value - 1) * pageSize.value
      }
    });
    records.value = data.records || [];
    total.value = data.total || 0;
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load records.';
  } finally {
    loading.value = false;
  }
}

async function fetchColumns() {
  loadingColumns.value = true;
  try {
    const { data } = await axios.get('/api/centralizator/columns', {
      params: { search: searchQuery.value || undefined }
    });
    availableColumns.value = data.keys || [];
    selectedColumns.value = selectedColumns.value.filter(col => availableColumns.value.includes(col));
  } catch (error: any) {
    console.warn('Failed to load columns:', error.response?.data?.error || error.message);
  } finally {
    loadingColumns.value = false;
  }
}

function toggleAllColumns(selectAll: boolean) {
  selectedColumns.value = selectAll ? [...availableColumns.value] : [];
}

async function exportCsv() {
  exporting.value = true;
  try {
    const params = new URLSearchParams();
    if (searchQuery.value) {
      params.set('search', searchQuery.value);
    }
    if (selectedColumns.value.length) {
      params.set('columns', selectedColumns.value.join(','));
    }

    const response = await axios.get(`/api/centralizator/export?${params.toString()}`, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `centralizator-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    alert('Error exporting: ' + (error.response?.data?.error || error.message));
  } finally {
    exporting.value = false;
  }
}

function goPrevious() {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
    fetchRecords();
  }
}

function goNext() {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
    fetchRecords();
  }
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
</script>
