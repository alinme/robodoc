<template>
  <div class="space-y-4">
    <!-- Connection Status -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-700">Status</p>
        <p
          :class="[
            'mt-1 text-sm',
            connected ? 'text-green-600' : 'text-red-600'
          ]"
        >
          {{ statusText }}
        </p>
      </div>
      <div
        :class="[
          'h-3 w-3 rounded-full',
          connected ? 'bg-green-500' : 'bg-red-500'
        ]"
      ></div>
    </div>

    <!-- QR Code -->
    <div v-if="status === 'connecting' && qrCodeImage" class="border border-gray-200 rounded-lg p-4">
      <p class="text-sm font-medium text-gray-700 mb-2">Scan QR Code with WhatsApp</p>
      <div class="flex justify-center">
        <img :src="qrCodeImage" alt="QR Code" class="max-w-xs" />
      </div>
      <p class="mt-2 text-xs text-gray-500 text-center">
        Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
      </p>
    </div>

    <div v-else-if="status === 'connecting'" class="text-sm text-gray-500">
      Waiting for QR code...
    </div>

    <div v-else-if="connected" class="text-sm text-green-600">
      ✓ WhatsApp is connected and ready to send messages
    </div>

    <div v-else class="text-sm text-gray-500">
      WhatsApp is not connected. Please wait for the QR code to appear.
    </div>

    <!-- Action Buttons -->
    <div v-if="!connected" class="mt-4 flex gap-2">
      <button
        @click="restartWhatsApp"
        :disabled="restarting || clearing"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer text-sm"
      >
        {{ restarting ? 'Restarting...' : 'Restart Connection' }}
      </button>
      <button
        v-if="status === 'connecting' && !qrCodeImage"
        @click="clearSession"
        :disabled="restarting || clearing"
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer text-sm"
      >
        {{ clearing ? 'Clearing...' : 'Clear Session & Get New QR' }}
      </button>
    </div>
    
    <!-- Info message if stuck in connecting -->
    <div v-if="status === 'connecting' && !qrCodeImage" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <p class="text-sm text-yellow-800">
        <strong>Waiting for QR code...</strong> This may take 10-30 seconds. If it doesn't appear, try clicking "Clear Session & Get New QR" to force a fresh connection.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useWhatsAppStore } from '@/stores/whatsapp';
import axios from 'axios';

const whatsappStore = useWhatsAppStore();

const status = computed(() => whatsappStore.status);
const connected = computed(() => whatsappStore.connected);
const qrCodeImage = computed(() => whatsappStore.qrCodeImage);
const restarting = ref(false);
const clearing = ref(false);

const statusText = computed(() => {
  switch (status.value) {
    case 'connected':
      return 'Connected';
    case 'authenticated':
      return 'Authenticated';
    case 'connecting':
      return 'Connecting...';
    default:
      return 'Disconnected';
  }
});

async function restartWhatsApp() {
  restarting.value = true;
  try {
    await axios.post('/api/whatsapp/restart');
    // Refresh status after a short delay
    setTimeout(() => {
      whatsappStore.fetchStatus();
      whatsappStore.fetchQRCode();
    }, 2000);
    alert('WhatsApp connection restarted. Please wait for the QR code to appear.');
  } catch (error: any) {
    alert('Error restarting WhatsApp: ' + (error.response?.data?.error || error.message));
  } finally {
    restarting.value = false;
  }
}

async function clearSession() {
  if (!confirm('This will clear your WhatsApp session and require you to scan a new QR code. Continue?')) {
    return;
  }
  
  clearing.value = true;
  try {
    await axios.post('/api/whatsapp/logout');
    // Refresh status multiple times to catch the QR code
    setTimeout(() => {
      whatsappStore.fetchStatus();
      whatsappStore.fetchQRCode();
    }, 2000);
    setTimeout(() => {
      whatsappStore.fetchStatus();
      whatsappStore.fetchQRCode();
    }, 5000);
    setTimeout(() => {
      whatsappStore.fetchStatus();
      whatsappStore.fetchQRCode();
    }, 10000);
    alert('Session cleared. A new QR code should appear in a few seconds. Please wait...');
  } catch (error: any) {
    alert('Error clearing session: ' + (error.response?.data?.error || error.message));
  } finally {
    clearing.value = false;
  }
}

onMounted(() => {
  whatsappStore.startPolling();
});

onUnmounted(() => {
  whatsappStore.stopPolling();
});
</script>

