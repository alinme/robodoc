import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const API_BASE = '/api';

export const useWhatsAppStore = defineStore('whatsapp', () => {
  const status = ref<'disconnected' | 'connecting' | 'connected' | 'authenticated'>('disconnected');
  const connected = ref(false);
  const qrCode = ref<string | null>(null);
  const qrCodeImage = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let statusInterval: number | null = null;

  // Fetch status
  async function fetchStatus() {
    try {
      const response = await axios.get(`${API_BASE}/whatsapp/status`);
      status.value = response.data.status;
      connected.value = response.data.connected;
    } catch (err: any) {
      console.error('Error fetching WhatsApp status:', err);
    }
  }

  // Fetch QR code
  async function fetchQRCode() {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_BASE}/whatsapp/qr`);
      console.log('QR Code response:', response.data);
      if (response.data.success && (response.data.image || response.data.qr)) {
        qrCode.value = response.data.qr;
        qrCodeImage.value = response.data.image;
        console.log('QR Code image set, length:', response.data.image ? response.data.image.length : 0);
      } else {
        // Don't clear existing QR code if we're still connecting
        if (status.value !== 'connecting') {
          qrCode.value = null;
          qrCodeImage.value = null;
        }
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      console.error('Error fetching QR code:', err);
    } finally {
      loading.value = false;
    }
  }

  // Start polling for status
  function startPolling() {
    if (statusInterval) return;
    // Initial fetch
    fetchStatus();
    fetchQRCode();
    // Then poll every 2 seconds (more frequent when waiting for QR)
    statusInterval = window.setInterval(() => {
      fetchStatus();
      // Always fetch QR code when connecting or disconnected (might be waiting for QR)
      if (status.value === 'connecting' || status.value === 'disconnected') {
        fetchQRCode();
      }
    }, 2000);
  }

  // Stop polling
  function stopPolling() {
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
  }

  return {
    status,
    connected,
    qrCode,
    qrCodeImage,
    loading,
    error,
    fetchStatus,
    fetchQRCode,
    startPolling,
    stopPolling
  };
});

