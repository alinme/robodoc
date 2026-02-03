<template>
  <div class="px-4 py-6 sm:px-0 space-y-6">
    <div>
      <h2 class="text-3xl font-bold text-gray-900">WhatsApp Connection Test</h2>
      <p class="mt-1 text-sm text-gray-500">
        Use this page to inspect raw WhatsApp connection data returned by the backend. Values refresh every 3 seconds.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">Status</h3>
          <span
            :class="[
              'px-3 py-1 rounded-full text-xs font-semibold',
              status.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            ]"
          >
            {{ status.connected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>

        <dl class="grid grid-cols-1 gap-y-2 text-sm text-gray-700">
          <div><span class="font-semibold">Status:</span> {{ status.status }}</div>
          <div><span class="font-semibold">Connected:</span> {{ status.connected }}</div>
          <div><span class="font-semibold">Client Exists:</span> {{ status.clientExists }}</div>
          <div><span class="font-semibold">Last Updated:</span> {{ lastUpdatedLabel }}</div>
        </dl>

        <div class="flex gap-2">
          <button
            @click="refresh"
            :disabled="loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer text-sm"
          >
            {{ loading ? 'Refreshing…' : 'Refresh Now' }}
          </button>
          <label class="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" v-model="autoRefresh" class="rounded border-gray-300" />
            Auto refresh
          </label>
        </div>

        <div v-if="statusError" class="text-sm text-red-600">
          {{ statusError }}
        </div>
      </div>

      <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">QR Code Response</h3>
          <span
            :class="[
              'px-3 py-1 rounded-full text-xs font-semibold',
              qr.success ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            ]"
          >
            {{ qr.success ? 'Available' : 'Pending' }}
          </span>
        </div>

        <div v-if="qr.image" class="border border-gray-200 rounded-lg p-4 flex justify-center">
          <img :src="qr.image" alt="QR Code" class="max-w-xs" />
        </div>
        <div v-else class="text-sm text-gray-500">
          No QR image returned.
        </div>

        <dl class="grid grid-cols-1 gap-y-2 text-sm text-gray-700">
          <div><span class="font-semibold">Success:</span> {{ qr.success }}</div>
          <div><span class="font-semibold">Message:</span> {{ qr.message || '—' }}</div>
          <div><span class="font-semibold">Has QR String:</span> {{ qr.qr ? 'Yes' : 'No' }}</div>
        </dl>

        <div v-if="qrError" class="text-sm text-red-600">
          {{ qrError }}
        </div>
      </div>
    </div>

    <div class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Raw JSON</h3>
      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 class="text-sm font-semibold text-gray-700 mb-1">/api/whatsapp/status</h4>
          <pre class="bg-gray-900 text-green-100 text-xs rounded-lg p-4 overflow-auto max-h-64">{{ formattedStatus }}</pre>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-gray-700 mb-1">/api/whatsapp/qr</h4>
          <pre class="bg-gray-900 text-green-100 text-xs rounded-lg p-4 overflow-auto max-h-64">{{ formattedQr }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import axios from 'axios';

interface StatusResponse {
  success: boolean;
  status: string;
  connected: boolean;
  clientExists?: boolean;
}

interface QrResponse {
  success: boolean;
  qr?: string | null;
  image?: string | null;
  message?: string;
  status?: string;
}

const status = ref<StatusResponse>({ success: false, status: 'unknown', connected: false });
const qr = ref<QrResponse>({ success: false });
const loading = ref(false);
const statusError = ref('');
const qrError = ref('');
const autoRefresh = ref(true);
const lastUpdated = ref<number | null>(null);

let intervalId: number | null = null;

const formattedStatus = computed(() => JSON.stringify(status.value, null, 2));
const formattedQr = computed(() => JSON.stringify(qr.value, null, 2));
const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return 'Never';
  return new Date(lastUpdated.value).toLocaleTimeString();
});

async function fetchStatus() {
  try {
    const response = await axios.get('/api/whatsapp/status');
    status.value = response.data;
    statusError.value = '';
  } catch (error: any) {
    statusError.value = error.response?.data?.error || error.message;
  }
}

async function fetchQr() {
  try {
    const response = await axios.get('/api/whatsapp/qr');
    qr.value = response.data;
    qrError.value = '';
  } catch (error: any) {
    qrError.value = error.response?.data?.error || error.message;
  }
}

async function refresh() {
  loading.value = true;
  await Promise.all([fetchStatus(), fetchQr()]);
  lastUpdated.value = Date.now();
  loading.value = false;
}

onMounted(async () => {
  await refresh();
  intervalId = window.setInterval(() => {
    if (autoRefresh.value) {
      refresh();
    }
  }, 3000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
});
</script>
