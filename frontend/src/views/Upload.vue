<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Upload Excel File</h2>
      <p class="mt-1 text-sm text-gray-500">Upload an Excel file and map columns to import contacts or check protocols</p>
    </div>

    <!-- Mode Tabs -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="mode = 'import'"
          :class="[
            'py-4 px-1 border-b-2 font-medium text-sm cursor-pointer',
            mode === 'import'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Import Contacts
        </button>
        <button
          @click="mode = 'protocol'"
          :class="[
            'py-4 px-1 border-b-2 font-medium text-sm cursor-pointer',
            mode === 'protocol'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Protocol Check
        </button>
        <button
          @click="mode = 'centralizator'"
          :class="[
            'py-4 px-1 border-b-2 font-medium text-sm cursor-pointer',
            mode === 'centralizator'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Centralizator
        </button>
        <button
          @click="mode = 'storage'"
          :class="[
            'py-4 px-1 border-b-2 font-medium text-sm cursor-pointer',
            mode === 'storage'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          File Storage
        </button>
      </nav>
    </div>

    <!-- Protocol Check Mode -->
    <div v-if="mode === 'protocol'">
      <ProtocolCheck :hide-header="true" />
    </div>

    <!-- File Storage Mode -->
    <div v-else-if="mode === 'storage'">
      <FileStorage />
    </div>

    <!-- Centralizator Mode -->
    <div v-else-if="mode === 'centralizator'">
      <CentralizatorImport />
    </div>

    <!-- Import Contacts Mode -->
    <div v-else>

    <!-- File Upload Section -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">1. Upload File</h3>
      <FileUpload @file-uploaded="handleFileUploaded" />
    </div>

    <!-- Previously Uploaded Files -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="text-lg font-medium text-gray-900">Or Select an Existing File</h3>
          <p class="text-sm text-gray-500">
            Choose from recently uploaded Excel files. Hidden columns and protocol decisions remain in the file.
          </p>
        </div>
        <button
          type="button"
          @click="fetchStoredFiles"
          class="self-start px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
        >
          Refresh
        </button>
      </div>

      <div v-if="storedFilesError" class="mt-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {{ storedFilesError }}
      </div>

      <div v-else-if="loadingStoredFiles" class="mt-3 text-sm text-gray-600 flex items-center gap-2">
        <span class="h-4 w-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
        Loading files...
      </div>

      <div v-else-if="availableFiles.length === 0" class="mt-3 text-sm text-gray-500">
        No stored files yet. Upload a file to populate this list.
      </div>

      <ul v-else class="mt-4 space-y-3">
        <li
          v-for="file in displayedStoredFiles"
          :key="file.fileId"
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-200 rounded-md px-4 py-3"
        >
          <div class="space-y-1">
            <p class="text-sm font-medium text-gray-900">
              {{ file.originalName }}
            </p>
            <p class="text-xs text-gray-500">
              Uploaded {{ formatUploadedAt(file.uploadedAt) }}
              <span v-if="file.sizeBytes" class="mx-1">•</span>
              <span v-if="file.sizeBytes">{{ formatFileSize(file.sizeBytes) }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click="loadStoredFile(file.fileId)"
              class="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="loadingStoredFileId === file.fileId"
            >
              <span v-if="loadingStoredFileId === file.fileId" class="flex items-center gap-2">
                <span class="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
              <span v-else>Load File</span>
            </button>
            <button
              type="button"
              @click="deleteStoredFile(file.fileId)"
              class="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="deletingFileId === file.fileId"
            >
              <span v-if="deletingFileId === file.fileId" class="flex items-center gap-2">
                <span class="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </span>
              <span v-else>Delete</span>
            </button>
          </div>
        </li>
      </ul>
      <div v-if="availableFiles.length > 3" class="mt-3">
        <button
          type="button"
          @click="showAllStoredFiles = !showAllStoredFiles"
          class="text-sm text-green-700 hover:text-green-800 font-semibold"
        >
          {{ showAllStoredFiles ? 'Show less' : `Show more (${availableFiles.length - 3} more)` }}
        </button>
      </div>
    </div>

    <!-- Sheet Selection -->
    <div v-if="uploadedFile" class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">2. Select Sheet</h3>
      <div class="space-y-2">
        <label v-for="sheet in sheets" :key="sheet.name" class="flex items-center">
          <input
            type="radio"
            :value="sheet.name"
            v-model="selectedSheet"
            class="mr-2"
            @change="onSheetSelected"
          />
          <span>{{ sheet.name }} ({{ sheet.rowCount }} rows, {{ sheet.headers.length }} columns)</span>
        </label>
      </div>
    </div>

    <!-- Header Row Selection -->
    <div v-if="selectedSheet && selectedSheetData" class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">3. Select Header Row</h3>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Which row contains the column headers?
        </label>
        <select
          v-model="headerRow"
          class="w-full border border-gray-300 rounded-md px-3 py-2"
          @change="onHeaderRowChanged"
        >
          <option v-for="row in availableHeaderRows" :key="row" :value="row">
            Row {{ row }}
          </option>
        </select>
      </div>
      
      <!-- Preview of rows -->
      <div class="mt-4">
        <p class="text-sm font-medium text-gray-700 mb-2">Preview (first 10 rows):</p>
        <div class="overflow-x-auto border border-gray-200 rounded-md max-h-96">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-2 py-1 text-left border border-gray-200 bg-gray-50">Row #</th>
                <th
                  v-for="(cell, idx) in (selectedSheetData.preview[0]?.cells || [])"
                  :key="idx"
                  class="px-2 py-1 text-left border border-gray-200 bg-gray-50"
                >
                  Col {{ idx + 1 }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="previewRow in selectedSheetData.preview"
                :key="previewRow.rowNumber"
                :class="{
                  'bg-green-50 font-semibold': previewRow.rowNumber === headerRow
                }"
              >
                <td class="px-2 py-1 border border-gray-200 font-medium">
                  {{ previewRow.rowNumber }}
                  <span v-if="previewRow.rowNumber === headerRow" class="text-green-600 ml-1">✓ Headers</span>
                </td>
                <td
                  v-for="(cell, idx) in previewRow.cells"
                  :key="idx"
                  class="px-2 py-1 border border-gray-200"
                >
                  {{ cell || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-xs text-gray-500">
          The selected header row is highlighted in green. Make sure this row contains your column names.
        </p>
      </div>
    </div>

    <!-- Column Mapping -->
    <div v-if="selectedSheet && selectedSheetData && currentHeaders.length > 0" class="bg-white shadow rounded-lg p-6 mb-6 space-y-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="space-y-1">
          <h3 class="text-lg font-medium text-gray-900">4. Map Columns</h3>
          <p class="text-sm text-gray-500">
            Load a saved mapping to auto-fill the column selections, or adjust manually below.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            v-model="selectedMappingId"
            class="w-full sm:w-64 border border-gray-300 rounded-md px-3 py-2"
            :disabled="loadingMappings || savedMappings.length === 0"
          >
            <option :value="null">
              {{ loadingMappings ? 'Loading saved mappings...' : 'Select saved mapping' }}
            </option>
            <option
              v-for="mapping in savedMappings"
              :key="mapping.id"
              :value="mapping.id"
            >
              {{ mapping.name }}
            </option>
          </select>
          <button
            type="button"
            @click="clearSelectedMapping"
            class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
            :disabled="selectedMappingId === null"
          >
            Clear
          </button>
          <button
            type="button"
            @click="fetchMappings"
            class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      <div v-if="mappingsError" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {{ mappingsError }}
      </div>
      <div v-else-if="mappingInfo" class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded text-sm">
        {{ mappingInfo }}
      </div>
      <div v-else-if="savedMappings.length === 0 && !loadingMappings" class="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded text-sm">
        No saved mappings yet. Configure the columns and click "Save Mapping" to reuse it later.
      </div>

      <ColumnMapper
        :headers="currentHeaders"
        :mapping="columnMapping"
        @update:mapping="columnMapping = $event"
        @mapping-saved="onMappingSaved"
      />
    </div>

    <!-- Rules Section -->
    <div v-if="selectedSheet && selectedSheetData && currentHeaders.length > 0" class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">5. Add Rules (Optional)</h3>
      <RuleBuilder
        :headers="currentHeaders"
        :rules="selectedRules"
        @update:rules="selectedRules = $event"
      />
    </div>

    <!-- Group Selection -->
    <div v-if="selectedSheet && selectedSheetData" class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">6. Select or Create Group</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Existing Group</label>
          <select
            v-model="selectedGroupId"
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            @change="newGroupName = ''"
          >
            <option :value="null">-- Select Group --</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Or Create New Group</label>
          <input
            type="text"
            v-model="newGroupName"
            placeholder="Enter group name"
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            @input="selectedGroupId = null"
          />
        </div>
      </div>
    </div>

    <!-- Preview Step -->
    <div v-if="selectedSheet && selectedSheetData && currentHeaders.length > 0 && !showPreview" class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">7. Preview & Validate</h3>
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-600">
          Preview all contacts before importing to check for duplicates and issues
        </p>
        <button
          @click="previewImport"
          :disabled="!canImport || loadingPreview"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ loadingPreview ? 'Loading Preview...' : 'Preview Import' }}
        </button>
      </div>
    </div>

    <!-- Import Preview Component -->
    <div v-if="showPreview && previewData" class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">7. Review & Import</h3>
      <ImportPreview
        :preview="previewData.preview"
        :stats="previewData.stats"
        @proceed="proceedWithPreviewedImport"
        @cancel="showPreview = false"
      />
    </div>

    <!-- Direct Import (Skip Preview) -->
    <div v-if="selectedSheet && selectedSheetData && currentHeaders.length > 0 && !showPreview" class="bg-white shadow rounded-lg p-6 mt-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">8. Import Contacts (Skip Preview)</h3>
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-500">
          Import without preview (not recommended)
        </p>
        <button
          @click="importContacts"
          :disabled="!canImport || importing"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ importing ? 'Importing...' : 'Import Without Preview' }}
        </button>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="importResult" class="mt-6">
      <div
        v-if="importResult.success"
        class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded"
      >
        <div class="font-semibold mb-2">Import completed successfully!</div>
        <div class="text-sm space-y-1">
          <div>✓ Processed: {{ importResult.totalProcessed || importResult.imported }} contacts</div>
          <div v-if="importResult.new > 0">✓ New contacts created: {{ importResult.new }}</div>
          <div v-if="importResult.updated > 0">✓ Existing contacts updated: {{ importResult.updated }}</div>
          <div v-if="importResult.skipped > 0" class="text-yellow-700">
            ⚠ Skipped: {{ importResult.skipped }} contacts (check console for details)
          </div>
        </div>
      </div>
      <div
        v-else
        class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded"
      >
        Error: {{ importResult.error }}
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import FileUpload from '@/components/FileUpload.vue';
import ColumnMapper from '@/components/ColumnMapper.vue';
import RuleBuilder from '@/components/RuleBuilder.vue';
import ImportPreview from '@/components/ImportPreview.vue';
import CentralizatorImport from '@/components/CentralizatorImport.vue';
import ProtocolCheck from '@/views/ProtocolCheck.vue';
import FileStorage from '@/components/FileStorage.vue';
import { useContactsStore } from '@/stores/contacts';
import { useGroupsStore } from '@/stores/groups';
import { useRulesStore } from '@/stores/rules';
import type { ExcelSheet, ColumnMapping, UploadResponse, UploadedFile } from '@/types/api';
import type { Rule } from '@/types/rule';

const mode = ref<'import' | 'protocol' | 'storage' | 'centralizator'>('import');

const router = useRouter();
const contactsStore = useContactsStore();
const groupsStore = useGroupsStore();
const rulesStore = useRulesStore();

const uploadedFile = ref<string | null>(null);
const sheets = ref<ExcelSheet[]>([]);
const selectedSheet = ref<string | null>(null);
const selectedSheetData = ref<ExcelSheet | null>(null);
const headerRow = ref<number>(1);
const columnMapping = ref<ColumnMapping>({
  name: '',
  name_column: null,
  phone_column: null,
  email_column: null,
  group_column: null,
  business_column: null
});
const selectedRules = ref<Rule[]>([]);
const selectedGroupId = ref<number | null>(null);
const newGroupName = ref('');
const importing = ref(false);
const importResult = ref<any>(null);
const availableFiles = ref<UploadedFile[]>([]);
const loadingStoredFiles = ref(false);
const loadingStoredFileId = ref<string | null>(null);
const storedFilesError = ref<string | null>(null);
const showAllStoredFiles = ref(false);
const deletingFileId = ref<string | null>(null);
const savedMappings = ref<ColumnMapping[]>([]);
const loadingMappings = ref(false);
const mappingsError = ref<string | null>(null);
const selectedMappingId = ref<number | null>(null);
const mappingInfo = ref<string | null>(null);
const showPreview = ref(false);
const loadingPreview = ref(false);
const previewData = ref<any>(null);

const groups = computed(() => groupsStore.groups);

// Available header rows (first 10 rows or up to totalRows)
const availableHeaderRows = computed(() => {
  if (!selectedSheetData.value) return [1];
  const maxRow = Math.min(10, selectedSheetData.value.totalRows);
  return Array.from({ length: maxRow }, (_, i) => i + 1);
});

const displayedStoredFiles = computed(() => {
  return showAllStoredFiles.value ? availableFiles.value : availableFiles.value.slice(0, 3);
});

// Current headers based on selected header row
const currentHeaders = computed(() => {
  if (!selectedSheetData.value || !selectedSheetData.value.preview) return [];
  const headerRowData = selectedSheetData.value.preview.find(
    row => row.rowNumber === headerRow.value
  );
  return headerRowData ? headerRowData.cells : [];
});

const canImport = computed(() => {
  return (
    selectedSheet.value &&
    headerRow.value > 0 &&
    currentHeaders.value.length > 0 &&
    columnMapping.value.name_column &&
    columnMapping.value.phone_column &&
    (selectedGroupId.value || newGroupName.value)
  );
});

onMounted(async () => {
  await groupsStore.fetchGroups();
  await rulesStore.fetchRules();
  await fetchStoredFiles();
  await fetchMappings();
});

function applyUploadResponse(data: UploadResponse) {
  uploadedFile.value = data.fileId;
  sheets.value = data.sheets;
  selectedSheet.value = null;
  selectedSheetData.value = null;
  importResult.value = null;
  selectedMappingId.value = null;
  mappingInfo.value = null;
}

async function handleFileUploaded(data: UploadResponse) {
  applyUploadResponse(data);
  await fetchStoredFiles();
  await fetchMappings();
}

async function fetchStoredFiles() {
  loadingStoredFiles.value = true;
  storedFilesError.value = null;

  try {
    const { data } = await axios.get<{ success: boolean; files: UploadedFile[] }>('/api/upload/files');
    if (data.success) {
      availableFiles.value = data.files;
    } else {
      storedFilesError.value = 'Failed to load stored files.';
    }
  } catch (error: any) {
    storedFilesError.value = error.response?.data?.error || error.message || 'Failed to load stored files.';
  } finally {
    loadingStoredFiles.value = false;
  }
}

async function loadStoredFile(fileId: string) {
  loadingStoredFileId.value = fileId;
  importResult.value = null;

  try {
    const { data } = await axios.get<UploadResponse>(`/api/upload/files/${fileId}`);
    applyUploadResponse(data);
  } catch (error: any) {
    importResult.value = {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to load the stored file.'
    };
    await fetchStoredFiles();
    await fetchMappings();
  } finally {
    loadingStoredFileId.value = null;
  }
}

async function deleteStoredFile(fileId: string) {
  if (!confirm('Delete this uploaded file?')) return;
  deletingFileId.value = fileId;
  try {
    await axios.delete(`/api/upload/files/${fileId}`);
    await fetchStoredFiles();
  } catch (error: any) {
    alert('Error deleting file: ' + (error.response?.data?.error || error.message));
  } finally {
    deletingFileId.value = null;
  }
}

function formatUploadedAt(value: string) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatFileSize(bytes: number | null) {
  if (bytes === null || bytes === undefined || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, exponent);
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

async function fetchMappings() {
  loadingMappings.value = true;
  mappingsError.value = null;

  try {
    const { data } = await axios.get<{ success: boolean; mappings: ColumnMapping[] }>('/api/upload/mappings');
    savedMappings.value = data.mappings || [];
  } catch (error: any) {
    mappingsError.value = error.response?.data?.error || error.message || 'Failed to load saved mappings.';
  } finally {
    loadingMappings.value = false;
  }
}

function clearSelectedMapping() {
  selectedMappingId.value = null;
  mappingInfo.value = null;
}

function applyMappingRecord(mapping: ColumnMapping) {
  if (!currentHeaders.value.length) {
    mappingInfo.value = 'Select the header row before applying a saved mapping.';
    return;
  }

  const headers = new Set(currentHeaders.value);
  const resolveHeader = (value: string | null) => (value && headers.has(value) ? value : null);
  const missing: string[] = [];

  if (mapping.name_column && !headers.has(mapping.name_column)) {
    missing.push(`Name "${mapping.name_column}"`);
  }
  if (mapping.phone_column && !headers.has(mapping.phone_column)) {
    missing.push(`Phone "${mapping.phone_column}"`);
  }
  if (mapping.email_column && !headers.has(mapping.email_column)) {
    missing.push(`Email "${mapping.email_column}"`);
  }
  if (mapping.group_column && !headers.has(mapping.group_column)) {
    missing.push(`Group "${mapping.group_column}"`);
  }
  if (mapping.business_column && !headers.has(mapping.business_column)) {
    missing.push(`Business "${mapping.business_column}"`);
  }

  columnMapping.value = {
    id: mapping.id,
    name: mapping.name,
    name_column: resolveHeader(mapping.name_column ?? null),
    phone_column: resolveHeader(mapping.phone_column ?? null),
    email_column: resolveHeader(mapping.email_column ?? null),
    group_column: resolveHeader(mapping.group_column ?? null),
    business_column: resolveHeader(mapping.business_column ?? null)
  };

  mappingInfo.value = missing.length
    ? `Loaded mapping "${mapping.name}". Missing columns were skipped: ${missing.join(', ')}.`
    : `Loaded mapping "${mapping.name}".`;
}

function applySelectedMapping() {
  if (selectedMappingId.value === null) return;
  const mapping = savedMappings.value.find(m => m.id === selectedMappingId.value);
  if (!mapping) {
    mappingInfo.value = 'Selected mapping was not found. Try refreshing.';
    selectedMappingId.value = null;
    return;
  }
  applyMappingRecord(mapping);
}

function onMappingSaved() {
  fetchMappings();
}

watch(selectedMappingId, (newId) => {
  if (newId === null) {
    mappingInfo.value = null;
    return;
  }
  applySelectedMapping();
});

function onSheetSelected() {
  if (selectedSheet.value) {
    selectedSheetData.value = sheets.value.find(s => s.name === selectedSheet.value) || null;
    // Reset header row to 1 when sheet changes
    headerRow.value = 1;
    // Reset column mapping
    columnMapping.value = {
      name: '',
      name_column: null,
      phone_column: null,
      email_column: null,
      group_column: null,
      business_column: null
    };
    // Auto-detect header row and map columns after header row is set
    onHeaderRowChanged();
  }
}

function onHeaderRowChanged() {
  if (!selectedSheetData.value) return;
  
  // Get headers from selected row
  const headerRowData = selectedSheetData.value.preview.find(r => r.rowNumber === headerRow.value);
  if (!headerRowData) return;
  
  const headerValues = headerRowData.cells;
  const headers = headerValues.map(h => String(h || '').toLowerCase());
  
  // Reset column mappings that don't exist in new headers
  if (columnMapping.value.name_column && !headerValues.includes(columnMapping.value.name_column)) {
    columnMapping.value.name_column = null;
  }
  if (columnMapping.value.phone_column && !headerValues.includes(columnMapping.value.phone_column)) {
    columnMapping.value.phone_column = null;
  }
  if (columnMapping.value.email_column && !headerValues.includes(columnMapping.value.email_column)) {
    columnMapping.value.email_column = null;
  }
  if (columnMapping.value.business_column && !headerValues.includes(columnMapping.value.business_column)) {
    columnMapping.value.business_column = null;
  }
  if (columnMapping.value.group_column && !headerValues.includes(columnMapping.value.group_column)) {
    columnMapping.value.group_column = null;
  }
  
  // Auto-map common column names if not already mapped
  if (!columnMapping.value.name_column) {
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('nume'));
    if (nameIdx !== -1) {
      columnMapping.value.name_column = headerValues[nameIdx] || null;
    }
  }
  if (!columnMapping.value.phone_column) {
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('telefon') || h.includes('tel'));
    if (phoneIdx !== -1) {
      columnMapping.value.phone_column = headerValues[phoneIdx] || null;
    }
  }
  if (!columnMapping.value.email_column) {
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('e-mail') || h.includes('mail'));
    if (emailIdx !== -1) {
      columnMapping.value.email_column = headerValues[emailIdx] || null;
    }
  }
  if (!columnMapping.value.business_column) {
    const businessIdx = headers.findIndex(h => h.includes('business') || h.includes('institution') || h.includes('instituție'));
    if (businessIdx !== -1) {
      columnMapping.value.business_column = headerValues[businessIdx] || null;
    }
  }

  if (selectedMappingId.value !== null) {
    applySelectedMapping();
  }
}

async function previewImport() {
  if (!canImport.value || !uploadedFile.value || !selectedSheet.value) return;

  loadingPreview.value = true;
  previewData.value = null;

  try {
    const response = await axios.post('/api/contacts/preview', {
      fileId: uploadedFile.value,
      sheetName: selectedSheet.value,
      columnMapping: columnMapping.value,
      rules: selectedRules.value,
      headerRow: headerRow.value
    });

    if (response.data.success) {
      // Mark all as selected by default
      response.data.preview.forEach((item: any) => {
        if (item.canImport) {
          item.selected = true;
        }
      });
      previewData.value = response.data;
      showPreview.value = true;
    }
  } catch (error: any) {
    importResult.value = {
      success: false,
      error: error.response?.data?.error || error.message
    };
  } finally {
    loadingPreview.value = false;
  }
}

async function proceedWithPreviewedImport(correctedContacts: any[]) {
  if (!uploadedFile.value || !selectedSheet.value) return;

  importing.value = true;
  importResult.value = null;
  showPreview.value = false;

  try {
    // Create group if needed
    let groupId = selectedGroupId.value;
    if (newGroupName.value && !groupId) {
      const group = await groupsStore.createGroup(newGroupName.value);
      groupId = group.id;
    }

    // Import contacts with corrections
    const response = await axios.post('/api/contacts/import', {
      fileId: uploadedFile.value,
      sheetName: selectedSheet.value,
      columnMapping: columnMapping.value,
      groupId,
      rules: selectedRules.value,
      headerRow: headerRow.value,
      correctedContacts: correctedContacts
    });

    const data = response.data;
    importResult.value = {
      success: true,
      imported: data.imported,
      new: data.new || 0,
      updated: data.updated || 0,
      skipped: data.skipped || 0,
      totalProcessed: data.totalProcessed || data.imported
    };

    // Refresh contacts
    await contactsStore.fetchContacts();

    // Redirect to contacts page after 2 seconds
    setTimeout(() => {
      router.push('/contacts');
    }, 2000);
  } catch (error: any) {
    importResult.value = {
      success: false,
      error: error.response?.data?.error || error.message
    };
  } finally {
    importing.value = false;
  }
}

async function importContacts() {
  if (!canImport.value || !uploadedFile.value || !selectedSheet.value) return;

  importing.value = true;
  importResult.value = null;

  try {
    // Create group if needed
    let groupId = selectedGroupId.value;
    if (newGroupName.value && !groupId) {
      const group = await groupsStore.createGroup(newGroupName.value);
      groupId = group.id;
    }

    // Import contacts
    const response = await axios.post('/api/contacts/import', {
      fileId: uploadedFile.value,
      sheetName: selectedSheet.value,
      columnMapping: columnMapping.value,
      groupId,
      rules: selectedRules.value,
      headerRow: headerRow.value
    });

    const data = response.data;
    importResult.value = {
      success: true,
      imported: data.imported,
      new: data.new || 0,
      updated: data.updated || 0,
      skipped: data.skipped || 0,
      totalProcessed: data.totalProcessed || data.imported
    };

    // Refresh contacts
    await contactsStore.fetchContacts();

    // Redirect to contacts page after 2 seconds
    setTimeout(() => {
      router.push('/contacts');
    }, 2000);
  } catch (error: any) {
    importResult.value = {
      success: false,
      error: error.response?.data?.error || error.message
    };
  } finally {
    importing.value = false;
  }
}
</script>

