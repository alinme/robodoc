<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Settings</h2>
      <p class="mt-1 text-sm text-gray-500">Manage WhatsApp connection and saved mappings</p>
    </div>

    <!-- WhatsApp Status -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">WhatsApp Connection</h3>
      <WhatsAppStatus />
    </div>

    <!-- WhatsApp Test Link -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">WhatsApp Testing</h3>
      <p class="text-sm text-gray-500 mb-4">
        Test and inspect raw WhatsApp connection data returned by the backend.
      </p>
      <router-link
        to="/whatsapp-test"
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 cursor-pointer"
      >
        Open WhatsApp Test Page
      </router-link>
    </div>

    <!-- SMTP Settings -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Email (SMTP) Settings</h3>
      <p class="text-sm text-gray-500 mb-4">
        Configure SMTP settings to send emails to contacts. For Gmail, use an App Password.
      </p>
      
      <form @submit.prevent="saveSmtpSettings" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">SMTP Host *</label>
            <input
              v-model="smtpSettings.host"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">SMTP Port *</label>
            <input
              v-model.number="smtpSettings.port"
              type="number"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="587"
            />
          </div>
        </div>

        <div>
          <label class="flex items-center">
            <input
              v-model="smtpSettings.secure"
              type="checkbox"
              class="mr-2"
            />
            <span class="text-sm font-medium text-gray-700">Use SSL/TLS (Direct SSL - for port 465)</span>
          </label>
          <p class="mt-1 text-xs text-gray-500 ml-6">
            <strong>Checked:</strong> Direct SSL/TLS connection (use with port 465)<br>
            <strong>Unchecked:</strong> STARTTLS (use with port 587 - recommended for MailerSend and Gmail)
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Username/Email *</label>
          <input
            v-model="smtpSettings.username"
            type="text"
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="your-email@gmail.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Password/App Password *</label>
          <input
            v-model="smtpSettings.password"
            type="password"
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Enter password or App Password"
          />
          <p class="mt-1 text-xs text-gray-500">
            For Gmail, use an App Password. <a href="https://support.google.com/accounts/answer/185833" target="_blank" class="text-blue-600 hover:underline">Learn more</a>
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">From Name (optional)</label>
            <input
              v-model="smtpSettings.from_name"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="RoboDoc"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">From Email (optional)</label>
            <input
              v-model="smtpSettings.from_email"
              type="email"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="noreply@example.com"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Reply To (optional)</label>
          <input
            v-model="smtpSettings.reply_to"
            type="email"
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="reply@example.com"
          />
          <p class="mt-1 text-xs text-gray-500">
            Email address where replies should be sent. If not set, replies will go to the From Email.
          </p>
        </div>

        <div class="border-t pt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Test Email Address</label>
          <div class="flex gap-2">
            <input
              v-model="testEmailAddress"
              type="email"
              class="flex-1 border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter email address to send test email"
            />
            <button
              type="button"
              @click="testSmtpConnection"
              :disabled="testingSmtp || !testEmailAddress"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {{ testingSmtp ? 'Sending...' : 'Send Test Email' }}
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500">
            Enter an email address and click "Send Test Email" to test your SMTP configuration.
          </p>
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="savingSmtp"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {{ savingSmtp ? 'Saving...' : 'Save SMTP Settings' }}
          </button>
        </div>

        <div v-if="smtpTestResult" class="p-3 rounded-md" :class="smtpTestResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
          {{ smtpTestResult.message }}
        </div>
      </form>
    </div>

    <!-- Saved Mappings -->
    <div class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Saved Column Mappings</h3>
      <div v-if="mappings.length === 0" class="text-sm text-gray-500">
        No saved mappings yet. Create one when uploading a file.
      </div>
      <div v-else class="space-y-4">
        <div
          v-for="mapping in mappings"
          :key="mapping.id"
          class="border border-gray-200 rounded-lg p-4"
        >
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-medium text-gray-900">{{ mapping.name }}</h4>
              <div class="mt-2 text-sm text-gray-600 space-y-1">
                <div>Name: {{ mapping.name_column || '-' }}</div>
                <div>Phone: {{ mapping.phone_column || '-' }}</div>
                <div>Group: {{ mapping.group_column || '-' }}</div>
                <div>Business: {{ mapping.business_column || '-' }}</div>
              </div>
            </div>
            <button
              @click="deleteMapping(mapping.id!)"
              class="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import WhatsAppStatus from '@/components/WhatsAppStatus.vue';
import type { ColumnMapping } from '@/types/api';

const mappings = ref<ColumnMapping[]>([]);
const smtpSettings = ref({
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  from_name: '',
  from_email: '',
  reply_to: ''
});
const savingSmtp = ref(false);
const testingSmtp = ref(false);
const smtpTestResult = ref<{ success: boolean; message: string } | null>(null);
const testEmailAddress = ref('');

onMounted(async () => {
  await fetchMappings();
  await fetchSmtpSettings();
});

async function fetchMappings() {
  try {
    const response = await axios.get('/api/upload/mappings');
    mappings.value = response.data.mappings;
  } catch (error) {
    console.error('Error fetching mappings:', error);
  }
}

async function deleteMapping(id: number) {
  if (!confirm('Are you sure you want to delete this mapping?')) return;

  try {
    await axios.delete(`/api/upload/mappings/${id}`);
    await fetchMappings();
  } catch (error: any) {
    alert('Error deleting mapping: ' + (error.response?.data?.error || error.message));
  }
}

async function fetchSmtpSettings() {
  try {
    const response = await axios.get('/api/settings/smtp');
    smtpSettings.value = {
      host: response.data.host || '',
      port: response.data.port || 587,
      secure: response.data.secure === 1 || response.data.secure === true,
      username: response.data.username || '',
      password: response.data.password || '', // Populate password from database
      from_name: response.data.from_name || '',
      from_email: response.data.from_email || '',
      reply_to: response.data.reply_to || ''
    };
  } catch (error: any) {
    console.error('Error fetching SMTP settings:', error);
  }
}

async function saveSmtpSettings() {
  savingSmtp.value = true;
  smtpTestResult.value = null;
  
  try {
    await axios.post('/api/settings/smtp', smtpSettings.value);
    alert('SMTP settings saved successfully!');
    await fetchSmtpSettings(); // Reload to get updated settings
  } catch (error: any) {
    alert('Error saving SMTP settings: ' + (error.response?.data?.error || error.message));
  } finally {
    savingSmtp.value = false;
  }
}

async function testSmtpConnection() {
  // Check if test email is provided
  if (!testEmailAddress.value || testEmailAddress.value.trim() === '') {
    smtpTestResult.value = {
      success: false,
      message: 'Please enter an email address to send the test email to.'
    };
    return;
  }

  const testEmail = testEmailAddress.value.trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(testEmail)) {
    smtpTestResult.value = {
      success: false,
      message: 'Please enter a valid email address.'
    };
    return;
  }

  testingSmtp.value = true;
  smtpTestResult.value = null;
  
  try {
    // Send test email using settings from database
    const response = await axios.post('/api/email/test', { testEmail });
    smtpTestResult.value = {
      success: true,
      message: response.data.message || 'Test email sent successfully!'
    };
  } catch (error: any) {
    smtpTestResult.value = {
      success: false,
      message: error.response?.data?.error || error.response?.data?.details || 'Failed to send test email'
    };
  } finally {
    testingSmtp.value = false;
  }
}
</script>

