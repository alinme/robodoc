<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Contact
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Message / Attachments
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Type / Status
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Sent At
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="messages.length === 0">
          <td colspan="5" class="px-6 py-4 text-center text-gray-500">
            No messages sent yet
          </td>
        </tr>
        <tr
          v-else
          v-for="message in messages"
          :key="message.id"
          class="hover:bg-gray-50"
        >
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <div class="font-medium text-gray-900">{{ message.contact_name || '-' }}</div>
            <div class="text-gray-500">{{ message.phone || '-' }}</div>
          </td>
          <td class="px-6 py-4 text-sm text-gray-500">
            <div class="max-w-md">
              <div class="truncate">{{ message.final_message || message.message_content }}</div>
              <!-- Show attachments for email messages -->
              <div v-if="message.attachments && message.attachments.length > 0" class="mt-2 flex flex-wrap gap-2">
                <a
                  v-for="attachment in message.attachments"
                  :key="attachment.id"
                  :href="`/api/attachments/${attachment.id}`"
                  target="_blank"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 cursor-pointer"
                  :title="attachment.original_filename"
                >
                  📎 {{ attachment.original_filename }}
                </a>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="space-y-1">
              <span
                :class="[
                  'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                  message.message_type === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                ]"
              >
                {{ message.message_type || 'whatsapp' }}
              </span>
              <br>
              <span
                :class="[
                  'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                  message.status === 'sent' ? 'bg-green-100 text-green-800' :
                  message.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                ]"
              >
                {{ message.status }}
              </span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {{ message.sent_at ? new Date(message.sent_at).toLocaleString() : '-' }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button
              v-if="message.status === 'failed'"
              @click="$emit('retry', message.id)"
              class="text-blue-600 hover:text-blue-900 cursor-pointer"
            >
              Retry
            </button>
            <span v-else class="text-gray-400">-</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '@/types/message';

defineProps<{
  messages: Message[];
}>();

defineEmits<{
  (e: 'retry', messageId: number): void;
  (e: 'delete', messageId: number): void;
}>();
</script>

