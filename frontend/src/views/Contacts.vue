<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold text-gray-900">Contacts</h2>
        <p class="mt-1 text-sm text-gray-500">Manage your imported contacts</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="showAddModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
        >
          + Add Contact
        </button>
        <router-link
          to="/upload"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
        >
          + Import Contacts
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search by name, phone, or business..."
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            @input="handleSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Group</label>
          <select
            v-model="selectedGroupId"
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            @change="handleFilter"
          >
            <option :value="null">All Groups</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Business</label>
          <input
            type="text"
            v-model="businessFilter"
            placeholder="Filter by business..."
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            @input="handleFilter"
          />
        </div>
      </div>
    </div>

    <!-- Contacts Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <ContactTable
        :contacts="contacts"
        :loading="loading"
        :selected-ids="selectedContactIds"
        @select="handleSelect"
        @select-all="handleSelectAll"
        @edit="handleEdit"
        @delete="handleDelete"
      />

      <!-- Pagination -->
      <div v-if="total > 0" class="px-6 py-4 border-t border-gray-200">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <div class="text-sm text-gray-700">
              <span v-if="pageSize === 0">Showing all {{ total }} contacts</span>
              <span v-else>Showing {{ startRecord }} to {{ endRecord }} of {{ total }} contacts</span>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-700">Show:</label>
              <select
                v-model="pageSize"
                @change="handlePageSizeChange"
                class="border border-gray-300 rounded-md px-2 py-1 text-sm cursor-pointer"
              >
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="0">All</option>
              </select>
            </div>
          </div>
          <div v-if="pageSize > 0" class="flex gap-2">
            <button
              @click="loadPrevious"
              :disabled="offset === 0"
              class="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span class="px-3 py-1 text-sm text-gray-700">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            <button
              @click="loadNext"
              :disabled="!hasNextPage"
              class="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedContactIds.length > 0" class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-blue-900">
          {{ selectedContactIds.length }} contact(s) selected
        </span>
        <div class="flex gap-2">
          <button
            @click="validateContacts"
            :disabled="validating"
            class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {{ validating ? 'Validating...' : 'Validate Selected' }}
          </button>
          <button
            @click="exportSelectedContacts"
            :disabled="exporting"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {{ exporting ? 'Exporting...' : 'Export Selected' }}
          </button>
          <button
            @click="deleteSelectedContacts"
            :disabled="deleting"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {{ deleting ? 'Deleting...' : 'Delete Selected' }}
          </button>
          <button
            @click="goToMessages"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
          >
            Send Message
          </button>
          <button
            @click="selectedContactIds = []"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>

    <!-- Validate All, Export All, and Delete All Buttons -->
    <div class="mt-6 flex justify-end gap-2">
      <button
        @click="validateAllContacts"
        :disabled="validating"
        class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
      >
        {{ validating ? 'Validating...' : 'Validate All Contacts' }}
      </button>
      <button
        @click="exportAllContacts"
        :disabled="exporting || total === 0"
        class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
      >
        {{ exporting ? 'Exporting...' : 'Export All Contacts' }}
      </button>
      <button
        @click="deleteAllContacts"
        :disabled="deleting || total === 0"
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
      >
        {{ deleting ? 'Deleting...' : 'Delete All Contacts' }}
      </button>
    </div>

    <!-- Add Contact Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showAddModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Add New Contact</h3>
          <form @submit.prevent="handleAddContact">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  v-model="newContact.name"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  v-model="newContact.phone"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  :class="{ 'border-red-500': phoneError }"
                  placeholder="e.g., 712345678 or 0712345678"
                  @blur="validatePhoneNumber('new')"
                />
                <p v-if="phoneError" class="mt-1 text-xs text-red-600">{{ phoneError }}</p>
                <p v-else class="mt-1 text-xs text-gray-500">
                  Enter 9 digits (e.g., 712345678) or 10 digits with leading 0 (e.g., 0712345678). Country code 40 will be added automatically.
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <select
                  v-model="newContact.group_id"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option :value="null">-- No Group --</option>
                  <option v-for="group in groups" :key="group.id" :value="group.id">
                    {{ group.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Business</label>
                <input
                  v-model="newContact.business"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Business/Institution"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-6">
              <button
                type="button"
                @click="showAddModal = false"
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="addingContact"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {{ addingContact ? 'Adding...' : 'Add Contact' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Validation Results Modal -->
    <div
      v-if="showValidationModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showValidationModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Validation Results</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-4 mb-4">
              <div class="bg-blue-50 p-3 rounded">
                <div class="text-sm text-gray-600">Total</div>
                <div class="text-2xl font-bold text-blue-600">{{ validationResults?.total || 0 }}</div>
              </div>
              <div class="bg-green-50 p-3 rounded">
                <div class="text-sm text-gray-600">Valid</div>
                <div class="text-2xl font-bold text-green-600">{{ validationResults?.valid || 0 }}</div>
              </div>
              <div class="bg-red-50 p-3 rounded">
                <div class="text-sm text-gray-600">Invalid</div>
                <div class="text-2xl font-bold text-red-600">{{ validationResults?.invalid || 0 }}</div>
              </div>
            </div>
            <div v-if="validationResults?.updated > 0" class="bg-yellow-50 p-3 rounded">
              <div class="text-sm text-gray-600">Updated</div>
              <div class="text-lg font-semibold text-yellow-600">{{ validationResults.updated }} contact(s) were updated with corrected phone numbers</div>
            </div>
            <div v-if="validationResults?.results?.invalid?.length > 0" class="mt-4">
              <h4 class="font-medium text-red-600 mb-2">Invalid Contacts:</h4>
              <div class="max-h-60 overflow-y-auto border border-red-200 rounded">
                <table class="min-w-full divide-y divide-red-200">
                  <thead class="bg-red-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-red-700">Name</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-red-700">Phone</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-red-700">Error</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-red-200">
                    <tr v-for="contact in validationResults.results.invalid" :key="contact.id">
                      <td class="px-4 py-2 text-sm">{{ contact.name }}</td>
                      <td class="px-4 py-2 text-sm">{{ contact.phone }}</td>
                      <td class="px-4 py-2 text-sm text-red-600">{{ contact.error }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="flex justify-end mt-6">
            <button
              @click="showValidationModal = false; validationResults = null"
              class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Contact Modal -->
    <div
      v-if="showEditModal && editingContact"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showEditModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Edit Contact</h3>
          <form @submit.prevent="handleUpdateContact">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  v-model="editingContact.name"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  v-model="editingContact.phone"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  :class="{ 'border-red-500': editPhoneError }"
                  placeholder="e.g., 712345678 or 0712345678"
                  @blur="validatePhoneNumber('edit')"
                />
                <p v-if="editPhoneError" class="mt-1 text-xs text-red-600">{{ editPhoneError }}</p>
                <p v-else class="mt-1 text-xs text-gray-500">
                  Enter 9 digits (e.g., 712345678) or 10 digits with leading 0 (e.g., 0712345678). Country code 40 will be added automatically.
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <select
                  v-model="editingContact.group_id"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option :value="null">-- No Group --</option>
                  <option v-for="group in groups" :key="group.id" :value="group.id">
                    {{ group.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Business</label>
                <input
                  v-model="editingContact.business"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Business/Institution"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-6">
              <button
                type="button"
                @click="showEditModal = false; editingContact = null"
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="addingContact"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {{ addingContact ? 'Updating...' : 'Update Contact' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import ContactTable from '@/components/ContactTable.vue';
import { useContactsStore } from '@/stores/contacts';
import { useGroupsStore } from '@/stores/groups';
import { useMessagesStore } from '@/stores/messages';
import { validateAndFormatPhone, formatPhoneForDisplay } from '@/utils/phoneValidator';
import type { Contact } from '@/types/contact';

const router = useRouter();
const contactsStore = useContactsStore();
const groupsStore = useGroupsStore();
const messagesStore = useMessagesStore();

const searchQuery = ref('');
const selectedGroupId = ref<number | null>(null);
const businessFilter = ref('');
const selectedContactIds = ref<number[]>([]);
const offset = ref(0);
const pageSize = ref(20);
const showAddModal = ref(false);
const showEditModal = ref(false);
const addingContact = ref(false);
const editingContact = ref<Contact | null>(null);
const phoneError = ref<string | null>(null);
const editPhoneError = ref<string | null>(null);
const validating = ref(false);
const deleting = ref(false);
const exporting = ref(false);
const showValidationModal = ref(false);
const validationResults = ref<any>(null);
const newContact = ref({
  name: '',
  phone: '',
  group_id: null as number | null,
  business: ''
});

const contacts = computed(() => contactsStore.contacts);
const groups = computed(() => groupsStore.groups);
const loading = computed(() => contactsStore.loading);
const total = computed(() => contactsStore.total);

const currentPage = computed(() => {
  if (pageSize.value === 0) return 1;
  return Math.floor(offset.value / pageSize.value) + 1;
});

const totalPages = computed(() => {
  if (pageSize.value === 0) return 1;
  return Math.ceil(total.value / pageSize.value);
});

const hasNextPage = computed(() => {
  if (pageSize.value === 0) return false;
  return offset.value + contacts.value.length < total.value;
});

const startRecord = computed(() => {
  if (total.value === 0) return 0;
  return offset.value + 1;
});

const endRecord = computed(() => {
  return offset.value + contacts.value.length;
});

onMounted(async () => {
  await groupsStore.fetchGroups();
  await contactsStore.fetchContacts(pageSize.value || 100, 0);
});

function handleSearch() {
  contactsStore.setFilters({ search: searchQuery.value });
  offset.value = 0;
  const limit = pageSize.value === 0 ? 10000 : pageSize.value;
  contactsStore.fetchContacts(limit, 0);
}

function handleFilter() {
  contactsStore.setFilters({
    groupId: selectedGroupId.value,
    business: businessFilter.value
  });
  offset.value = 0;
  const limit = pageSize.value === 0 ? 10000 : pageSize.value;
  contactsStore.fetchContacts(limit, 0);
}

function handlePageSizeChange() {
  offset.value = 0;
  const limit = pageSize.value === 0 ? 10000 : pageSize.value;
  contactsStore.fetchContacts(limit, 0);
}

function handleSelect(contactId: number, selected: boolean) {
  if (selected) {
    if (!selectedContactIds.value.includes(contactId)) {
      selectedContactIds.value.push(contactId);
    }
  } else {
    selectedContactIds.value = selectedContactIds.value.filter(id => id !== contactId);
  }
}

function handleSelectAll(selected: boolean) {
  if (selected) {
    selectedContactIds.value = contacts.value.map(c => c.id);
  } else {
    selectedContactIds.value = [];
  }
}

function handleEdit(contact: Contact) {
  // Create a copy and format phone for editing (remove country code for easier editing)
  const phoneForEdit = contact.phone.startsWith('40') && contact.phone.length === 10 
    ? contact.phone.substring(2) // Remove '40' prefix for editing
    : contact.phone;
  
  editingContact.value = { 
    ...contact, 
    phone: phoneForEdit 
  };
  editPhoneError.value = null;
  showEditModal.value = true;
}

async function handleDelete(contactId: number) {
  if (confirm('Are you sure you want to delete this contact?')) {
    try {
      await contactsStore.deleteContact(contactId);
      // Refresh the list to update the count
      const limit = pageSize.value === 0 ? 10000 : pageSize.value;
      await contactsStore.fetchContacts(limit, offset.value);
    } catch (error: any) {
      alert('Error deleting contact: ' + (error.response?.data?.error || error.message));
    }
  }
}

async function validateContacts() {
  if (selectedContactIds.value.length === 0) {
    alert('Please select contacts to validate');
    return;
  }

  validating.value = true;
  try {
    const response = await axios.post('/api/contacts/validate', {
      contactIds: selectedContactIds.value
    });
    validationResults.value = response.data;
    showValidationModal.value = true;
    // Refresh contacts list to show any updates
    const limit = pageSize.value === 0 ? 10000 : pageSize.value;
    await contactsStore.fetchContacts(limit, offset.value);
  } catch (error: any) {
    alert('Error validating contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    validating.value = false;
  }
}

async function validateAllContacts() {
  if (!confirm('This will validate all contacts. Continue?')) {
    return;
  }

  validating.value = true;
  try {
    const response = await axios.post('/api/contacts/validate', {});
    validationResults.value = response.data;
    showValidationModal.value = true;
    // Refresh contacts list to show any updates
    const limit = pageSize.value === 0 ? 10000 : pageSize.value;
    await contactsStore.fetchContacts(limit, offset.value);
  } catch (error: any) {
    alert('Error validating contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    validating.value = false;
  }
}

async function exportSelectedContacts() {
  if (selectedContactIds.value.length === 0) {
    alert('Please select contacts to export');
    return;
  }

  exporting.value = true;
  try {
    const contactIdsParam = selectedContactIds.value.join(',');
    const response = await axios.get('/api/contacts/export', {
      params: { contactIds: contactIdsParam },
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contacts-selected-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Error exporting contacts:', error);
    alert('Error exporting contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    exporting.value = false;
  }
}

async function exportAllContacts() {
  if (total.value === 0) {
    alert('No contacts to export');
    return;
  }

  if (!confirm(`Export all ${total.value} contacts to Gmail CSV format?`)) {
    return;
  }

  exporting.value = true;
  try {
    const response = await axios.get('/api/contacts/export', {
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contacts-all-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Error exporting contacts:', error);
    alert('Error exporting contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    exporting.value = false;
  }
}

async function deleteSelectedContacts() {
  if (selectedContactIds.value.length === 0) {
    alert('Please select contacts to delete');
    return;
  }

  if (!confirm(`Are you sure you want to delete ${selectedContactIds.value.length} selected contact(s)? This action cannot be undone.`)) {
    return;
  }

  deleting.value = true;
  try {
    await contactsStore.deleteContacts(selectedContactIds.value);
    selectedContactIds.value = [];
    // Refresh contacts list
    const limit = pageSize.value === 0 ? 10000 : pageSize.value;
    await contactsStore.fetchContacts(limit, offset.value);
    alert('Selected contacts deleted successfully');
  } catch (error: any) {
    alert('Error deleting contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    deleting.value = false;
  }
}

async function deleteAllContacts() {
  if (total.value === 0) {
    alert('No contacts to delete');
    return;
  }

  const confirmMessage = `Are you sure you want to delete ALL ${total.value} contacts? This action cannot be undone. Type "DELETE ALL" to confirm.`;
  const userInput = prompt(confirmMessage);
  
  if (userInput !== 'DELETE ALL') {
    return;
  }

  deleting.value = true;
  try {
    const deleted = await contactsStore.deleteAllContacts();
    selectedContactIds.value = [];
    // Refresh contacts list
    const limit = pageSize.value === 0 ? 10000 : pageSize.value;
    await contactsStore.fetchContacts(limit, offset.value);
    alert(`Successfully deleted ${deleted} contact(s)`);
  } catch (error: any) {
    alert('Error deleting all contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    deleting.value = false;
  }
}

function loadNext() {
  if (pageSize.value === 0) return;
  offset.value += pageSize.value;
  contactsStore.fetchContacts(pageSize.value, offset.value);
}

function loadPrevious() {
  if (pageSize.value === 0) return;
  offset.value = Math.max(0, offset.value - pageSize.value);
  contactsStore.fetchContacts(pageSize.value, offset.value);
}

function goToMessages() {
  messagesStore.setTemplate(messagesStore.template);
  router.push({
    path: '/messages',
    query: { contactIds: selectedContactIds.value.join(',') }
  });
}

function validatePhoneNumber(type: 'new' | 'edit') {
  const phone = type === 'new' ? newContact.value.phone : (editingContact.value?.phone || '');
  const validation = validateAndFormatPhone(phone);
  
  if (type === 'new') {
    phoneError.value = validation.valid ? null : validation.error;
  } else {
    editPhoneError.value = validation.valid ? null : validation.error;
  }
  
  return validation.valid;
}

async function handleAddContact() {
  if (!newContact.value.name || !newContact.value.phone) {
    alert('Name and phone are required');
    return;
  }

  // Validate phone number
  if (!validatePhoneNumber('new')) {
    return;
  }

  addingContact.value = true;
  try {
    // Phone will be validated and formatted on the backend
    await axios.post('/api/contacts', {
      name: newContact.value.name.trim(),
      phone: newContact.value.phone,
      group_id: newContact.value.group_id,
      business: newContact.value.business?.trim() || null
    });

    // Refresh contacts list
    const limit = pageSize.value === 0 ? 10000 : pageSize.value;
    await contactsStore.fetchContacts(limit, offset.value);

    // Reset form and close modal
    newContact.value = {
      name: '',
      phone: '',
      group_id: null,
      business: ''
    };
    phoneError.value = null;
    showAddModal.value = false;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message;
    alert('Error adding contact: ' + errorMsg);
    console.error('Add contact error:', error);
  } finally {
    addingContact.value = false;
  }
}

async function handleUpdateContact() {
  if (!editingContact.value || !editingContact.value.name || !editingContact.value.phone) {
    alert('Name and phone are required');
    return;
  }

  // Validate phone number
  if (!validatePhoneNumber('edit')) {
    return;
  }

  addingContact.value = true; // Reuse loading state
  try {
    // Phone will be validated and formatted on the backend
    await contactsStore.updateContact(editingContact.value.id, {
      name: editingContact.value.name.trim(),
      phone: editingContact.value.phone,
      group_id: editingContact.value.group_id,
      business: editingContact.value.business?.trim() || null
    });

    // Refresh contacts list
    const limit = pageSize.value === 0 ? 10000 : pageSize.value;
    await contactsStore.fetchContacts(limit, offset.value);

    // Close modal
    showEditModal.value = false;
    editingContact.value = null;
    editPhoneError.value = null;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message;
    alert('Error updating contact: ' + errorMsg);
    console.error('Update contact error:', error);
  } finally {
    addingContact.value = false;
  }
}
</script>

