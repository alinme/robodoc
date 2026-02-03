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
            placeholder="Search schools..."
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
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">School</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">State/Region</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Protocol #</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
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
              <td class="px-3 py-2">{{ item.schoolName || '-' }}</td>
              <td class="px-3 py-2">{{ item.address || '-' }}</td>
              <td class="px-3 py-2">{{ item.stateRegion || '-' }}</td>
              <td class="px-3 py-2">{{ item.protocolNumber || '-' }}</td>
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
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex justify-between items-center flex-wrap gap-4">
      <div class="text-sm text-gray-600 space-y-1 flex-1">
        <div v-if="stats.cannot_import > 0" class="text-red-600 font-medium">
          ⚠ {{ stats.cannot_import }} record(s) cannot be imported. Please fix them before proceeding.
        </div>
        <div v-if="selectedCount === 0" class="text-yellow-600 font-medium">
          ⚠ No records selected. Please select at least one record to import.
        </div>
        <div v-else-if="stats.cannot_import === 0" class="text-green-600">
          ✓ {{ selectedCount }} record(s) ready to import
        </div>
        <div v-if="stats.duplicate > 0" class="text-blue-600">
          ℹ {{ stats.duplicate }} duplicate(s) will update existing records on import.
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

const props = defineProps<{
  preview: any[];
  stats: any;
}>();

const emit = defineEmits<{
  (e: 'proceed', records: any[]): void;
  (e: 'cancel'): void;
}>();

const searchQuery = ref('');
const filterStatus = ref('all');

const filteredPreview = computed(() => {
  let filtered = [...props.preview];

  if (filterStatus.value !== 'all') {
    if (filterStatus.value === 'with_issues') {
      filtered = filtered.filter(item => item.issues.length > 0);
    } else if (filterStatus.value === 'cannot_import') {
      filtered = filtered.filter(item => !item.canImport);
    } else {
      filtered = filtered.filter(item => item.status === filterStatus.value);
    }
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(item =>
      item.schoolName?.toLowerCase().includes(query) ||
      item.address?.toLowerCase().includes(query) ||
      item.stateRegion?.toLowerCase().includes(query) ||
      item.protocolNumber?.toLowerCase().includes(query)
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

function proceedWithImport() {
  const recordsToImport = props.preview
    .filter(item => item.selected !== false && item.canImport)
    .map(item => ({
      schoolName: item.schoolName,
      address: item.address,
      stateRegion: item.stateRegion,
      protocolNumber: item.protocolNumber,
      rawData: item.rawData
    }));

  emit('proceed', recordsToImport);
}
</script>
