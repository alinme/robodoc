<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6 flex items-center gap-4">
      <button
        @click="$router.back()"
        class="p-2 text-gray-600 hover:text-gray-900 cursor-pointer"
        title="Go back"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <div>
        <h2 class="text-3xl font-bold text-gray-900">Contact History</h2>
        <p v-if="contact" class="mt-1 text-sm text-gray-500">
          Message history for {{ contact.name }}
        </p>
      </div>
    </div>

    <!-- Contact Info Card -->
    <div v-if="contact" class="bg-white shadow rounded-lg p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p class="text-sm font-medium text-gray-500">Name</p>
          <p class="mt-1 text-lg font-semibold text-gray-900">{{ contact.name }}</p>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-500">Phone</p>
          <p class="mt-1 text-lg font-semibold text-gray-900">{{ formatPhone(contact.phone) }}</p>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-500">Messages Sent</p>
          <p class="mt-1 text-lg font-semibold text-green-600">{{ contact.sent_count || 0 }}</p>
        </div>
        <div v-if="contact.business">
          <p class="text-sm font-medium text-gray-500">Business</p>
          <p class="mt-1 text-lg font-semibold text-gray-900">{{ contact.business }}</p>
        </div>
        <div v-if="contact.group_name">
          <p class="text-sm font-medium text-gray-500">Group</p>
          <p class="mt-1 text-lg font-semibold text-gray-900">{{ contact.group_name }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading message history...</p>
    </div>

    <!-- Message History -->
    <div v-else class="bg-white shadow rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-900">Message History</h3>
        <div class="flex gap-2">
          <button
            v-if="messages.length > 0"
            @click="deleteAllMessages"
            :disabled="deleting"
            class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {{ deleting ? 'Deleting...' : 'Delete All' }}
          </button>
        </div>
      </div>
      
      <div v-if="messages.length === 0" class="px-6 py-12 text-center text-gray-500">
        No messages found for this contact
      </div>
      
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="message in messages"
          :key="message.id"
          class="px-6 py-4 hover:bg-gray-50"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span
                  :class="{
                    'bg-green-100 text-green-800': message.status === 'sent' || message.status === 'success',
                    'bg-yellow-100 text-yellow-800': message.status === 'pending',
                    'bg-red-100 text-red-800': message.status === 'failed'
                  }"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ message.status }}
                </span>
                <span class="text-sm text-gray-500">
                  {{ formatDate(message.sent_at) }}
                </span>
              </div>
              <div class="mt-2">
                <p class="text-sm font-medium text-gray-700 mb-1">Message:</p>
                <p class="text-sm text-gray-900 whitespace-pre-wrap">{{ message.final_message }}</p>
              </div>
              <div v-if="message.error_message" class="mt-2">
                <p class="text-sm font-medium text-red-700 mb-1">Error:</p>
                <p class="text-sm text-red-600">{{ message.error_message }}</p>
              </div>
            </div>
            <div class="ml-4 flex gap-2">
              <button
                v-if="message.status === 'failed'"
                @click="retryMessage(message.id)"
                :disabled="retrying"
                class="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {{ retrying ? 'Retrying...' : 'Retry' }}
              </button>
              <button
                @click="deleteMessage(message.id)"
                :disabled="deleting"
                class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > 0" class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-700">
          Showing {{ messages.length }} of {{ total }} messages
        </div>
        <div class="flex gap-2">
          <button
            @click="loadPrevious"
            :disabled="offset === 0"
            class="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Previous
          </button>
          <button
            @click="loadNext"
            :disabled="messages.length < limit"
            class="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { formatPhoneForDisplay } from '@/utils/phoneValidator';
import type { Contact } from '@/types/contact';

const route = useRoute();
const router = useRouter();

const contact = ref<Contact | null>(null);
const messages = ref<any[]>([]);
const loading = ref(false);
const retrying = ref(false);
const deleting = ref(false);
const total = ref(0);
const limit = ref(20);
const offset = ref(0);

onMounted(async () => {
  const contactId = parseInt(route.params.id as string);
  if (contactId) {
    await fetchContact(contactId);
    await fetchMessages(contactId);
  }
});

async function fetchContact(contactId: number) {
  try {
    const response = await axios.get(`/api/contacts/${contactId}`);
    contact.value = response.data.contact;
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    alert('Error loading contact: ' + (error.response?.data?.error || error.message));
  }
}

async function fetchMessages(contactId: number) {
  loading.value = true;
  try {
    const response = await axios.get('/api/messages/history', {
      params: {
        contactId,
        limit: limit.value,
        offset: offset.value
      }
    });
    messages.value = response.data.messages;
    total.value = response.data.total;
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    alert('Error loading messages: ' + (error.response?.data?.error || error.message));
  } finally {
    loading.value = false;
  }
}

function loadNext() {
  const contactId = parseInt(route.params.id as string);
  offset.value += limit.value;
  fetchMessages(contactId);
}

function loadPrevious() {
  const contactId = parseInt(route.params.id as string);
  offset.value = Math.max(0, offset.value - limit.value);
  fetchMessages(contactId);
}

async function retryMessage(messageId: number) {
  retrying.value = true;
  try {
    await axios.post(`/api/messages/retry/${messageId}`);
    alert('Message retried successfully');
    const contactId = parseInt(route.params.id as string);
    await fetchMessages(contactId);
  } catch (error: any) {
    alert('Error retrying message: ' + (error.response?.data?.error || error.message));
  } finally {
    retrying.value = false;
  }
}

async function deleteMessage(messageId: number) {
  if (!confirm('Are you sure you want to delete this message?')) {
    return;
  }
  
  deleting.value = true;
  try {
    await axios.delete(`/api/messages/${messageId}`);
    const contactId = parseInt(route.params.id as string);
    await fetchMessages(contactId);
    await fetchContact(contactId); // Refresh contact to update sent_count
  } catch (error: any) {
    alert('Error deleting message: ' + (error.response?.data?.error || error.message));
  } finally {
    deleting.value = false;
  }
}

async function deleteAllMessages() {
  const contactId = parseInt(route.params.id as string);
  if (!confirm(`Are you sure you want to delete all messages for this contact? This action cannot be undone.`)) {
    return;
  }
  
  deleting.value = true;
  try {
    await axios.delete(`/api/messages/contact/${contactId}`);
    await fetchMessages(contactId);
    await fetchContact(contactId); // Refresh contact to update sent_count
    alert('All messages deleted successfully');
  } catch (error: any) {
    alert('Error deleting messages: ' + (error.response?.data?.error || error.message));
  } finally {
    deleting.value = false;
  }
}

function formatPhone(phone: string): string {
  return formatPhoneForDisplay(phone);
}

function formatDate(dateString: string) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

