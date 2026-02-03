<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <input
              type="checkbox"
              :checked="allSelected"
              @change="$emit('select-all', ($event.target as HTMLInputElement).checked)"
              class="rounded border-gray-300"
            />
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Name
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Phone
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Email
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Group
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Business
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Messages
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            WAStatus
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="loading">
          <td colspan="9" class="px-6 py-4 text-center text-gray-500">
            Loading...
          </td>
        </tr>
        <tr v-else-if="contacts.length === 0">
          <td colspan="9" class="px-6 py-4 text-center text-gray-500">
            No contacts found
          </td>
        </tr>
        <tr
          v-else
          v-for="contact in contacts"
          :key="contact.id"
          class="hover:bg-gray-50"
          :class="{ 'cursor-pointer': contact.sent_count && contact.sent_count > 0 }"
          @click="handleRowClick(contact)"
        >
          <td class="px-6 py-4 whitespace-nowrap" @click.stop>
            <input
              type="checkbox"
              :checked="selectedIds.includes(contact.id)"
              @change="$emit('select', contact.id, ($event.target as HTMLInputElement).checked)"
              class="rounded border-gray-300 cursor-pointer"
            />
          </td>
          <td class="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
            <div class="flex items-center gap-1">
              <span :class="{ 'truncate': !expandedNames[contact.id] }" :title="expandedNames[contact.id] ? '' : contact.name">
                {{ contact.name }}
              </span>
              <button
                v-if="contact.name && contact.name.length > 20"
                @click.stop="toggleExpand(contact.id, 'name')"
                class="text-blue-600 hover:text-blue-800 text-xs cursor-pointer flex-shrink-0"
              >
                {{ expandedNames[contact.id] ? 'Hide' : 'Show' }}
              </button>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {{ formatPhone(contact.phone) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {{ contact.email || '-' }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {{ contact.group_name || '-' }}
          </td>
          <td class="px-6 py-4 text-sm text-gray-500 max-w-xs">
            <div v-if="contact.business" class="flex items-center gap-1">
              <span :class="{ 'truncate': !expandedBusiness[contact.id] }" :title="expandedBusiness[contact.id] ? '' : contact.business">
                {{ contact.business }}
              </span>
              <button
                v-if="contact.business.length > 20"
                @click.stop="toggleExpand(contact.id, 'business')"
                class="text-blue-600 hover:text-blue-800 text-xs cursor-pointer flex-shrink-0"
              >
                {{ expandedBusiness[contact.id] ? 'Hide' : 'Show' }}
              </button>
            </div>
            <span v-else class="text-gray-400">-</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <span v-if="contact.sent_count && contact.sent_count > 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Sent ({{ contact.sent_count }})
            </span>
            <span v-else class="text-gray-400">-</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <div v-if="contact.whatsapp_valid === null || contact.whatsapp_valid === undefined" class="text-gray-400">
              Not checked
            </div>
            <div v-else class="flex items-center gap-2">
              <span v-if="contact.whatsapp_valid === 1" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Valid
              </span>
              <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                ✗ Invalid
              </span>
              <span v-if="contact.whatsapp_in_contacts === 1" class="text-xs text-blue-600" title="In your WhatsApp contacts">
                📱
              </span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex items-center gap-3">
              <button
                v-if="contact.email"
                @click.stop="sendEmail(contact)"
                class="text-green-600 hover:text-green-900 cursor-pointer"
                title="Send Email"
              >
                📧 Email
              </button>
              <button
                @click.stop="$emit('edit', contact)"
                class="text-blue-600 hover:text-blue-900 cursor-pointer"
              >
                Edit
              </button>
              <button
                @click.stop="$emit('delete', contact.id)"
                class="text-red-600 hover:text-red-900 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { formatPhoneForDisplay } from '@/utils/phoneValidator';
import type { Contact } from '@/types/contact';

const router = useRouter();

const props = defineProps<{
  contacts: Contact[];
  loading: boolean;
  selectedIds: number[];
}>();

const emit = defineEmits<{
  (e: 'select', contactId: number, selected: boolean): void;
  (e: 'select-all', selected: boolean): void;
  (e: 'edit', contact: Contact): void;
  (e: 'delete', contactId: number): void;
}>();

const expandedNames = ref<Record<number, boolean>>({});
const expandedBusiness = ref<Record<number, boolean>>({});

const allSelected = computed(() => {
  return props.contacts.length > 0 && props.contacts.every(c => props.selectedIds.includes(c.id));
});

function formatPhone(phone: string): string {
  return formatPhoneForDisplay(phone);
}

function toggleExpand(contactId: number, type: 'name' | 'business') {
  if (type === 'name') {
    expandedNames.value[contactId] = !expandedNames.value[contactId];
  } else {
    expandedBusiness.value[contactId] = !expandedBusiness.value[contactId];
  }
}

function handleRowClick(contact: Contact) {
  // If contact has sent messages, navigate to history page
  if (contact.sent_count && contact.sent_count > 0) {
    router.push(`/contacts/${contact.id}/history`);
  } else {
    // Otherwise, toggle checkbox
    const isSelected = props.selectedIds.includes(contact.id);
    emit('select', contact.id, !isSelected);
  }
}

function sendEmail(contact: Contact) {
  // Navigate to messages page with contact pre-selected and email mode
  router.push({
    path: '/messages',
    query: {
      contactIds: contact.id.toString(),
      messageType: 'email'
    }
  });
}
</script>

