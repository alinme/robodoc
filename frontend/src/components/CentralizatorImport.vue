<template>
  <div class="space-y-6">
    <div class="mb-2">
      <h3 class="text-xl font-semibold text-gray-900">Centralizator</h3>
      <p class="text-sm text-gray-500">
        Upload an Excel file and configure each sheet (State/Region) with its own header row and mapping.
      </p>
    </div>

    <section class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">1. Upload File</h3>
      <FileUpload @file-uploaded="handleFileUploaded" />
    </section>

    <section class="bg-white shadow rounded-lg p-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="text-lg font-medium text-gray-900">Or Select an Existing File</h3>
          <p class="text-sm text-gray-500">
            Choose from recently uploaded Excel files.
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
    </section>

    <section v-if="uploadedFile" class="bg-white shadow rounded-lg p-6 space-y-6">
      <div class="flex flex-col gap-2">
        <h3 class="text-lg font-medium text-gray-900">2. Configure Sheets (State/Region)</h3>
        <p class="text-sm text-gray-500">
          Each sheet can have its own header row and mapping. The sheet name will be saved as State/Region.
        </p>
      </div>

      <div v-if="sheets.length" class="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          v-for="sheet in sheets"
          :key="sheet.name"
          type="button"
          @click="activeSheetName = sheet.name"
          :class="[
            'px-3 py-2 rounded-md text-sm font-medium border cursor-pointer',
            activeSheetName === sheet.name
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          ]"
        >
          {{ sheet.name }}
          <span v-if="!isSheetReady(sheet.name)" class="ml-1 text-xs text-yellow-200">
            • needs mapping
          </span>
        </button>
      </div>
      <div v-else class="text-sm text-gray-500">
        No sheets detected yet.
      </div>

      <div v-if="activeSheet" class="space-y-6">
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 class="text-sm font-semibold text-gray-800 mb-2">
            Header row for {{ activeSheet.name }}
          </h4>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Which row contains the column headers?
            </label>
            <select
              v-model.number="sheetConfigs[activeSheet.name].headerRow"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              @change="onHeaderRowChanged(activeSheet.name)"
            >
              <option v-for="row in availableHeaderRows" :key="row" :value="row">
                Row {{ row }}
              </option>
            </select>
          </div>

          <div class="mt-4">
            <p class="text-sm font-medium text-gray-700 mb-2">Preview (first 10 rows):</p>
            <div class="overflow-x-auto border border-gray-200 rounded-md max-h-96 bg-white">
              <table class="min-w-full text-xs">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-2 py-1 text-left border border-gray-200 bg-gray-50">Row #</th>
                    <th
                      v-for="(cell, idx) in (activeSheet.preview[0]?.cells || [])"
                      :key="idx"
                      class="px-2 py-1 text-left border border-gray-200 bg-gray-50"
                    >
                      Col {{ idx + 1 }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="previewRow in activeSheet.preview"
                    :key="previewRow.rowNumber"
                    :class="{
                      'bg-green-50 font-semibold': previewRow.rowNumber === sheetConfigs[activeSheet.name].headerRow
                    }"
                  >
                    <td class="px-2 py-1 border border-gray-200 font-medium">
                      {{ previewRow.rowNumber }}
                      <span
                        v-if="previewRow.rowNumber === sheetConfigs[activeSheet.name].headerRow"
                        class="text-green-600 ml-1"
                      >
                        ✓ Headers
                      </span>
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
              The selected header row is highlighted in green.
            </p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div class="space-y-1">
              <h3 class="text-lg font-medium text-gray-900">3. Map Columns</h3>
              <p class="text-sm text-gray-500">
                Map the school columns for {{ activeSheet.name }}.
              </p>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2">
              <select
                v-model="sheetConfigs[activeSheet.name].selectedMappingId"
                class="w-full sm:w-64 border border-gray-300 rounded-md px-3 py-2"
                :disabled="loadingMappings || savedMappings.length === 0"
                @change="applySelectedMapping(activeSheet.name)"
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
                @click="clearSelectedMapping(activeSheet.name)"
                class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
                :disabled="sheetConfigs[activeSheet.name].selectedMappingId === null"
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
          <div
            v-else-if="sheetConfigs[activeSheet.name].mappingInfo"
            class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded text-sm"
          >
            {{ sheetConfigs[activeSheet.name].mappingInfo }}
          </div>
          <div v-else-if="savedMappings.length === 0 && !loadingMappings" class="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded text-sm">
            No saved mappings yet. Configure the columns and click "Save Mapping" to reuse it later.
          </div>

          <CentralizatorMapper
            :headers="activeHeaders"
            :mapping="sheetConfigs[activeSheet.name].mapping"
            @update:mapping="updateSheetMapping(activeSheet.name, $event)"
            @mapping-saved="onMappingSaved"
          />
        </div>
      </div>
    </section>

    <section v-if="uploadedFile && canImport && !showPreview" class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">5. Preview & Import</h3>
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-600">
          Preview the records before importing to check for duplicates and issues.
        </p>
        <button
          @click="previewImport"
          :disabled="!canImport || loadingPreview"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ loadingPreview ? 'Loading Preview...' : 'Preview Import' }}
        </button>
      </div>
    </section>

    <section v-if="showPreview && previewData" class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">5. Review & Import</h3>
      <CentralizatorPreview
        :preview="previewData.preview"
        :stats="previewData.stats"
        @proceed="proceedWithPreviewedImport"
        @cancel="showPreview = false"
      />
    </section>

    <section v-if="importResult" class="mt-6">
      <div
        v-if="importResult.success"
        class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded"
      >
        <div class="font-semibold mb-2">Import completed successfully!</div>
        <div class="text-sm space-y-1">
          <div>✓ Processed: {{ importResult.totalProcessed || importResult.imported }} records</div>
          <div v-if="importResult.new > 0">✓ New records created: {{ importResult.new }}</div>
          <div v-if="importResult.updated > 0">✓ Existing records updated: {{ importResult.updated }}</div>
          <div v-if="importResult.skipped > 0" class="text-yellow-700">
            ⚠ Skipped: {{ importResult.skipped }} records
          </div>
        </div>
      </div>
      <div
        v-else
        class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded"
      >
        Error: {{ importResult.error }}
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import FileUpload from '@/components/FileUpload.vue';
import CentralizatorMapper from '@/components/CentralizatorMapper.vue';
import CentralizatorPreview from '@/components/CentralizatorPreview.vue';
import type { ExcelSheet, UploadResponse, UploadedFile, CentralizatorMapping } from '@/types/api';

const uploadedFile = ref<string | null>(null);
const sheets = ref<ExcelSheet[]>([]);
const availableFiles = ref<UploadedFile[]>([]);
const loadingStoredFiles = ref(false);
const loadingStoredFileId = ref<string | null>(null);
const storedFilesError = ref<string | null>(null);
const showAllStoredFiles = ref(false);
const deletingFileId = ref<string | null>(null);
const savedMappings = ref<CentralizatorMapping[]>([]);
const loadingMappings = ref(false);
const mappingsError = ref<string | null>(null);
const showPreview = ref(false);
const loadingPreview = ref(false);
const previewData = ref<any>(null);
const importResult = ref<any>(null);

const activeSheetName = ref<string>('');
const sheetConfigs = ref<Record<string, {
  headerRow: number;
  mapping: CentralizatorMapping;
  selectedMappingId: number | null;
  mappingInfo: string | null;
}>>({});

const activeSheet = computed(() => {
  return sheets.value.find(sheet => sheet.name === activeSheetName.value) || null;
});

const availableHeaderRows = computed(() => {
  const sheet = activeSheet.value;
  if (!sheet) return [1];
  const maxRow = Math.min(10, sheet.totalRows);
  return Array.from({ length: maxRow }, (_, i) => i + 1);
});

const activeHeaders = computed(() => {
  const sheet = activeSheet.value;
  if (!sheet) return [];
  const config = sheetConfigs.value[sheet.name];
  const headerRow = config?.headerRow ?? 1;
  const headerRowData = sheet.preview.find(row => row.rowNumber === headerRow);
  return headerRowData ? headerRowData.cells : [];
});

const displayedStoredFiles = computed(() => {
  return showAllStoredFiles.value ? availableFiles.value : availableFiles.value.slice(0, 3);
});

const canImport = computed(() => {
  if (!uploadedFile.value || sheets.value.length === 0) return false;
  return sheets.value.every(sheet => {
    const config = sheetConfigs.value[sheet.name];
    return (
      config &&
      config.headerRow > 0 &&
      config.mapping.school_name_column &&
      config.mapping.address_column
    );
  });
});

onMounted(async () => {
  await fetchStoredFiles();
  await fetchMappings();
});

function applyUploadResponse(data: UploadResponse) {
  uploadedFile.value = data.fileId;
  sheets.value = data.sheets;
  importResult.value = null;
  showPreview.value = false;
  previewData.value = null;
  activeSheetName.value = data.sheets[0]?.name ?? '';

  const nextConfigs: Record<string, {
    headerRow: number;
    mapping: CentralizatorMapping;
    selectedMappingId: number | null;
    mappingInfo: string | null;
  }> = {};

  data.sheets.forEach(sheet => {
    nextConfigs[sheet.name] = {
      headerRow: 1,
      mapping: {
        name: '',
        school_name_column: null,
        address_column: null,
        protocol_number_column: null
      },
      selectedMappingId: null,
      mappingInfo: null
    };
  });

  sheetConfigs.value = nextConfigs;
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
    storedFilesError.value = error.response?.data?.error || error.message || 'Failed to delete the stored file.';
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
    const { data } = await axios.get<{ success: boolean; mappings: CentralizatorMapping[] }>('/api/centralizator/mappings');
    savedMappings.value = data.mappings || [];
  } catch (error: any) {
    mappingsError.value = error.response?.data?.error || error.message || 'Failed to load saved mappings.';
  } finally {
    loadingMappings.value = false;
  }
}

function clearSelectedMapping(sheetName: string) {
  const config = sheetConfigs.value[sheetName];
  if (!config) return;
  config.selectedMappingId = null;
  config.mappingInfo = null;
}

function applyMappingRecord(sheetName: string, mapping: CentralizatorMapping) {
  const config = sheetConfigs.value[sheetName];
  if (!config) return;

  const headers = new Set(activeHeaders.value);
  if (!headers.size) {
    config.mappingInfo = 'Select the header row before applying a saved mapping.';
    return;
  }

  const resolveHeader = (value: string | null) => (value && headers.has(value) ? value : null);
  const missing: string[] = [];

  if (mapping.school_name_column && !headers.has(mapping.school_name_column)) {
    missing.push(`School "${mapping.school_name_column}"`);
  }
  if (mapping.address_column && !headers.has(mapping.address_column)) {
    missing.push(`Address "${mapping.address_column}"`);
  }
  if (mapping.protocol_number_column && !headers.has(mapping.protocol_number_column)) {
    missing.push(`Protocol "${mapping.protocol_number_column}"`);
  }

  config.mapping = {
    id: mapping.id,
    name: mapping.name,
    school_name_column: resolveHeader(mapping.school_name_column ?? null),
    address_column: resolveHeader(mapping.address_column ?? null),
    protocol_number_column: resolveHeader(mapping.protocol_number_column ?? null)
  };

  config.mappingInfo = missing.length
    ? `Loaded mapping "${mapping.name}". Missing columns were skipped: ${missing.join(', ')}.`
    : `Loaded mapping "${mapping.name}".`;
}

function applySelectedMapping(sheetName: string) {
  const config = sheetConfigs.value[sheetName];
  if (!config || config.selectedMappingId === null) return;
  const mapping = savedMappings.value.find(m => m.id === config.selectedMappingId);
  if (!mapping) {
    config.mappingInfo = 'Selected mapping was not found. Try refreshing.';
    config.selectedMappingId = null;
    return;
  }
  applyMappingRecord(sheetName, mapping);
}

function onMappingSaved() {
  fetchMappings();
}

watch(activeSheetName, (newName) => {
  if (!newName) return;
  const config = sheetConfigs.value[newName];
  if (config && config.selectedMappingId !== null) {
    applySelectedMapping(newName);
  }
});

function onHeaderRowChanged(sheetName: string) {
  const sheet = sheets.value.find(item => item.name === sheetName);
  const config = sheetConfigs.value[sheetName];
  if (!sheet || !config) return;

  const headerRowData = sheet.preview.find(r => r.rowNumber === config.headerRow);
  if (!headerRowData) return;

  const headerValues = headerRowData.cells;
  const headers = headerValues.map(h => String(h || '').toLowerCase());

  if (config.mapping.school_name_column && !headerValues.includes(config.mapping.school_name_column)) {
    config.mapping.school_name_column = null;
  }
  if (config.mapping.address_column && !headerValues.includes(config.mapping.address_column)) {
    config.mapping.address_column = null;
  }
  if (config.mapping.protocol_number_column && !headerValues.includes(config.mapping.protocol_number_column)) {
    config.mapping.protocol_number_column = null;
  }

  if (!config.mapping.school_name_column) {
    const nameIdx = headers.findIndex(h => h.includes('school') || h.includes('unit') || h.includes('name') || h.includes('institut'));
    if (nameIdx !== -1) {
      config.mapping.school_name_column = headerValues[nameIdx] || null;
    }
  }
  if (!config.mapping.address_column) {
    const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('adresa'));
    if (addressIdx !== -1) {
      config.mapping.address_column = headerValues[addressIdx] || null;
    }
  }
  if (!config.mapping.protocol_number_column) {
    const protocolIdx = headers.findIndex(h => h.includes('protocol') || h.includes('nr'));
    if (protocolIdx !== -1) {
      config.mapping.protocol_number_column = headerValues[protocolIdx] || null;
    }
  }

  if (config.selectedMappingId !== null) {
    applySelectedMapping(sheetName);
  }
}

async function previewImport() {
  if (!canImport.value || !uploadedFile.value) return;

  loadingPreview.value = true;
  previewData.value = null;

  try {
    const response = await axios.post('/api/centralizator/preview', {
      fileId: uploadedFile.value,
      sheetConfigs: buildSheetConfigsPayload()
    });

    if (response.data.success) {
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

async function proceedWithPreviewedImport(records: any[]) {
  if (!uploadedFile.value) return;

  importResult.value = null;
  showPreview.value = false;

  try {
    const response = await axios.post('/api/centralizator/import', {
      fileId: uploadedFile.value,
      sheetConfigs: buildSheetConfigsPayload(),
      rows: records
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
  } catch (error: any) {
    importResult.value = {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

function buildSheetConfigsPayload() {
  return sheets.value.map(sheet => {
    const config = sheetConfigs.value[sheet.name];
    return {
      sheetName: sheet.name,
      headerRow: config?.headerRow ?? 1,
      columnMapping: config?.mapping ?? {}
    };
  });
}

function updateSheetMapping(sheetName: string, mapping: CentralizatorMapping) {
  const config = sheetConfigs.value[sheetName];
  if (!config) return;
  config.mapping = { ...mapping };
}

function isSheetReady(sheetName: string) {
  const config = sheetConfigs.value[sheetName];
  if (!config) return false;
  return Boolean(config.mapping.school_name_column && config.mapping.address_column);
}
</script>
