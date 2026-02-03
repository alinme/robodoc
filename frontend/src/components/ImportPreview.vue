<template>
  <div class="space-y-4">
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 class="font-semibold text-blue-900 mb-2">Import Preview</h4>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <div class="text-blue-700 font-medium">Total</div>
          <div class="text-2xl font-bold text-blue-900">{{ stats.total }}</div>
        </div>
        <div>
          <div class="text-green-700 font-medium">New</div>
          <div class="text-2xl font-bold text-green-900">{{ stats.new }}</div>
        </div>
        <div>
          <div class="text-yellow-700 font-medium">Duplicates</div>
          <div class="text-2xl font-bold text-yellow-900">{{ stats.duplicate }}</div>
        </div>
        <div>
          <div class="text-orange-700 font-medium">Issues</div>
          <div class="text-2xl font-bold text-orange-900">{{ stats.with_issues }}</div>
        </div>
        <div>
          <div class="text-red-700 font-medium">Cannot Import</div>
          <div class="text-2xl font-bold text-red-900">{{ stats.cannot_import }}</div>
        </div>
      </div>
    </div>

    <div class="bg-white border rounded-lg overflow-hidden">
      <div class="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search contacts..."
            class="border rounded px-3 py-1 text-sm"
          />
          <select
            v-model="filterStatus"
            class="border rounded px-3 py-1 text-sm"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="duplicate">Duplicates</option>
            <option value="duplicate_in_file">Duplicates in File</option>
            <option value="with_issues">With Issues</option>
            <option value="cannot_import">Cannot Import</option>
          </select>
        </div>
        <div class="text-sm text-gray-600">
          Showing {{ filteredPreview.length }} of {{ preview.length }}
        </div>
      </div>
      <div class="overflow-x-auto" style="max-height: 600px; overflow-y: auto;">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  @change="toggleAll"
                  class="rounded"
                />
              </th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="(item, index) in filteredPreview"
              :key="index"
              :class="{
                'bg-red-50': !item.canImport,
                'bg-yellow-50': item.status === 'duplicate' || item.status === 'duplicate_in_file',
                'bg-green-50': item.status === 'new' && item.canImport && item.issues.length === 0
              }"
            >
              <td class="px-3 py-2">
                <input
                  type="checkbox"
                  :checked="item.selected !== false"
                  @change="(e) => item.selected = (e.target as HTMLInputElement).checked"
                  :disabled="!item.canImport"
                  class="rounded"
                />
              </td>
              <td class="px-3 py-2">
                <span
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    item.status === 'new' ? 'bg-green-100 text-green-800' :
                    item.status === 'duplicate' ? 'bg-yellow-100 text-yellow-800' :
                    item.status === 'duplicate_in_file' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ item.status === 'new' ? 'New' :
                     item.status === 'duplicate' ? 'Duplicate' :
                     item.status === 'duplicate_in_file' ? 'Dup in File' : 'Issue' }}
                </span>
              </td>
              <td class="px-3 py-2">
                <input
                  v-if="editingIndex === index"
                  v-model="item.name"
                  class="w-full border rounded px-2 py-1 text-xs"
                  @blur="stopEditing(item)"
                  @keyup.enter="stopEditing(item)"
                  @keyup.escape="editingIndex = null"
                />
                <span v-else @dblclick="startEditing(index)" class="cursor-pointer hover:bg-gray-100 px-1 rounded">
                  {{ item.name || '-' }}
                </span>
              </td>
              <td class="px-3 py-2">
                <input
                  v-if="editingIndex === index"
                  v-model="item.phone"
                  class="w-full border rounded px-2 py-1 text-xs"
                  @blur="validatePhone(item)"
                  @keyup.enter="validatePhone(item)"
                  @keyup.escape="editingIndex = null"
                />
                <span v-else @dblclick="startEditing(index)" class="cursor-pointer hover:bg-gray-100 px-1 rounded">
                  {{ item.phone || '-' }}
                </span>
                <div v-if="item.existingContact" class="text-xs text-yellow-700 mt-1">
                  Exists: {{ item.existingContact.name }} ({{ item.existingContact.phone }})
                </div>
                <div v-if="item.phoneError" class="text-xs text-red-600 mt-1">
                  {{ item.phoneError }}
                </div>
              </td>
              <td class="px-3 py-2">
                <input
                  v-if="editingIndex === index"
                  v-model="item.email"
                  class="w-full border rounded px-2 py-1 text-xs"
                  @blur="validateEmail(item)"
                  @keyup.enter="validateEmail(item)"
                  @keyup.escape="editingIndex = null"
                />
                <span v-else @dblclick="startEditing(index)" class="cursor-pointer hover:bg-gray-100 px-1 rounded">
                  {{ item.email || '-' }}
                </span>
                <div v-if="item.emailError" class="text-xs text-red-600 mt-1">
                  {{ item.emailError }}
                </div>
              </td>
              <td class="px-3 py-2">
                <input
                  v-if="editingIndex === index"
                  v-model="item.business"
                  class="w-full border rounded px-2 py-1 text-xs"
                  @blur="stopEditing(item)"
                  @keyup.enter="stopEditing(item)"
                  @keyup.escape="editingIndex = null"
                />
                <span v-else @dblclick="startEditing(index)" class="cursor-pointer hover:bg-gray-100 px-1 rounded">
                  {{ item.business || '-' }}
                </span>
              </td>
              <td class="px-3 py-2">
                <div v-if="item.issues.length > 0" class="text-xs">
                  <div
                    v-for="(issue, i) in item.issues"
                    :key="i"
                    class="text-red-600"
                  >
                    • {{ issue }}
                  </div>
                </div>
                <span v-else class="text-green-600 text-xs">✓ OK</span>
              </td>
              <td class="px-3 py-2">
                <div class="flex flex-col gap-1">
                  <button
                    v-if="item.status === 'duplicate' && item.existingContact"
                    @click="mergeWithExisting(item)"
                    class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Merge
                  </button>
                  <button
                    v-if="item.status === 'duplicate' && item.existingContact"
                    @click="changePhoneToMakeNew(item)"
                    class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Change Phone
                  </button>
                  <button
                    v-if="item.status === 'duplicate_in_file'"
                    @click="removeDuplicate(item)"
                    class="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex justify-between items-center flex-wrap gap-4">
      <div class="text-sm text-gray-600 space-y-1 flex-1">
        <div v-if="stats.cannot_import > 0" class="text-red-600 font-medium">
          ⚠ {{ stats.cannot_import }} contact(s) cannot be imported. Please fix them before proceeding.
        </div>
        <div v-if="selectedCount === 0" class="text-yellow-600 font-medium">
          ⚠ No contacts selected. Please select at least one contact to import.
        </div>
        <div v-else-if="stats.cannot_import === 0" class="text-green-600">
          ✓ {{ selectedCount }} contact(s) ready to import
        </div>
        <div v-if="stats.duplicate > 0" class="text-blue-600">
          ℹ {{ stats.duplicate }} duplicate(s) found. Use "Merge" or "Change Phone" to handle them.
        </div>
        <div v-if="stats.duplicate_in_file > 0" class="text-orange-600">
          ℹ {{ stats.duplicate_in_file }} duplicate(s) within file. Use "Remove" to exclude them.
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          @click="proceedWithImport"
          :disabled="selectedCount === 0 || stats.cannot_import > 0"
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Proceed with Import ({{ selectedCount }} selected)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { validateAndFormatPhone } from '@/utils/phoneValidator';

const props = defineProps<{
  preview: any[];
  stats: any;
}>();

const emit = defineEmits<{
  (e: 'proceed', contacts: any[]): void;
  (e: 'cancel'): void;
}>();

const searchQuery = ref('');
const filterStatus = ref('all');
const editingIndex = ref<number | null>(null);

function startEditing(index: number) {
  editingIndex.value = index;
}

function stopEditing(item: any) {
  // Update issues if name was empty
  if (!item.name || !item.name.trim()) {
      if (!item.issues.some((i: string) => i.includes('Missing name'))) {
        item.issues.push('Missing name');
      }
    item.canImport = false;
  } else {
    item.issues = item.issues.filter((i: string) => i !== 'Missing name');
    if (item.issues.length === 0 && item.phone && item.phone.trim()) {
      item.canImport = true;
    }
  }
  editingIndex.value = null;
}

function validatePhone(item: any) {
  item.phoneError = null;
  if (!item.phone || !item.phone.trim()) {
    item.phoneError = 'Phone is required';
    item.canImport = false;
    if (!item.issues.some((i: string) => i.includes('Missing phone'))) {
      item.issues.push('Missing phone');
    }
    editingIndex.value = null;
    return;
  }

  try {
    const validation = validateAndFormatPhone(item.phone.trim());
    if (validation.valid) {
      const oldPhone = item.phone;
      item.phone = validation.formatted;
      
      // Remove phone-related issues
      item.issues = item.issues.filter((i: string) => 
        !i.toLowerCase().includes('phone') && 
        !i.toLowerCase().includes('invalid phone') &&
        !i.toLowerCase().includes('missing phone')
      );
      
      // If phone changed, clear duplicate status and existing contact
      if (oldPhone !== item.phone || item.status === 'duplicate' || item.status === 'duplicate_in_file') {
        // Check if new phone still exists in database (would need API call, but for now just clear status)
        item.status = 'new';
        item.existingContact = null;
        // Remove duplicate issues
        item.issues = item.issues.filter((i: string) => 
          !i.includes('already exists') && 
          !i.includes('Duplicate phone')
        );
      }
      
      // Re-check if can import
      if (item.name && item.name.trim() && item.issues.length === 0) {
        item.canImport = true;
      }
    } else {
      item.phoneError = validation.error || 'Invalid phone format';
      item.canImport = false;
      if (!item.issues.some((i: string) => i.includes('Invalid phone number'))) {
        item.issues.push('Invalid phone number');
      }
    }
  } catch (error) {
    item.phoneError = 'Error validating phone';
  }
  editingIndex.value = null;
}

function validateEmail(item: any) {
  item.emailError = null;
  if (item.email && item.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(item.email.trim())) {
      item.emailError = 'Invalid email format';
      // Don't block import, just warn
      if (!item.issues.some((i: string) => i.includes('Invalid email format'))) {
        item.issues.push('Invalid email format');
      }
    } else {
      // Remove email error from issues
      item.issues = item.issues.filter((i: string) => i !== 'Invalid email format');
    }
  }
  editingIndex.value = null;
}

const filteredPreview = computed(() => {
  let filtered = [...props.preview];
  
  // Filter by status
  if (filterStatus.value !== 'all') {
    if (filterStatus.value === 'with_issues') {
      filtered = filtered.filter(item => item.issues.length > 0);
    } else if (filterStatus.value === 'cannot_import') {
      filtered = filtered.filter(item => !item.canImport);
    } else {
      filtered = filtered.filter(item => item.status === filterStatus.value);
    }
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(item =>
      item.name?.toLowerCase().includes(query) ||
      item.phone?.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query) ||
      item.business?.toLowerCase().includes(query)
    );
  }
  
  return filtered;
});

const allSelected = computed(() => {
  return filteredPreview.value.length > 0 &&
    filteredPreview.value.every(item => item.selected !== false && item.canImport);
});

const selectedCount = computed(() => {
  return props.preview.filter(item => item.selected !== false && item.canImport).length;
});

function toggleAll() {
  const shouldSelect = !allSelected.value;
  filteredPreview.value.forEach(item => {
    if (item.canImport) {
      item.selected = shouldSelect;
    }
  });
}

function mergeWithExisting(item: any) {
  // Show merge details
  const mergeDetails = [];
  if (item.name !== item.existingContact.name) {
    mergeDetails.push(`Name: "${item.existingContact.name}" → "${item.name}"`);
  }
  if (item.email && item.email !== item.existingContact.email) {
    mergeDetails.push(`Email: "${item.existingContact.email || 'none'}" → "${item.email}"`);
  }
  if (item.business && item.business !== item.existingContact.business) {
    mergeDetails.push(`Business: "${item.existingContact.business || 'none'}" → "${item.business}"`);
  }

  const message = `Merge "${item.name}" with existing contact "${item.existingContact.name}"?\n\n` +
    (mergeDetails.length > 0 ? `Changes:\n${mergeDetails.join('\n')}\n\n` : '') +
    'The existing contact will be updated with the new data.';
  
  if (confirm(message)) {
    // Update the item to use existing contact ID and merge data
    item.mergeAction = 'update';
    item.mergeTargetId = item.existingContact.id;
    item.status = 'merged';
    // Remove duplicate issue
    item.issues = item.issues.filter((i: string) => !i.includes('already exists'));
    item.canImport = true;
  }
}

function removeDuplicate(item: any) {
  if (confirm(`Remove duplicate contact "${item.name}" from import?`)) {
    item.selected = false;
  }
}

function changePhoneToMakeNew(item: any) {
  const newPhone = prompt(
    `Change phone number for "${item.name}" to make it a new contact:\n\n` +
    `Current: ${item.phone}\n` +
    `Existing contact: ${item.existingContact.name} (${item.existingContact.phone})\n\n` +
    `Enter new phone number:`,
    item.phone
  );
  
  if (newPhone && newPhone.trim() && newPhone !== item.phone) {
    const validation = validateAndFormatPhone(newPhone.trim());
    if (validation.valid) {
      item.phone = validation.formatted;
      item.status = 'new';
      item.existingContact = null;
      item.issues = item.issues.filter((i: string) => !i.includes('already exists'));
      item.canImport = true;
      // Check if new phone also exists
      // Note: This would require an API call, but for now we'll let the backend handle it
    } else {
      alert(`Invalid phone number: ${validation.error}`);
    }
  }
}

function proceedWithImport() {
  // Get all selected contacts
  const contactsToImport = props.preview
    .filter(item => item.selected !== false && item.canImport)
    .map(item => ({
      name: item.name,
      phone: item.phone,
      email: item.email || null,
      business: item.business || null,
      group: item.group || null,
      rawData: item.rawData,
      mergeAction: item.mergeAction,
      mergeTargetId: item.mergeTargetId
    }));
  
  emit('proceed', contactsToImport);
}
</script>

