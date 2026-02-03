<template>
  <div class="space-y-6">
    <section v-if="!hideHeader">
      <h2 class="text-3xl font-bold text-gray-900">Protocol Check</h2>
      <p class="mt-1 text-sm text-gray-500">
        Upload the provided Excel file, review each institution, and record whether the protocol contract is signed.
        You can search, delete rows, add custom columns, and export the updated sheet once you finish.
      </p>
    </section>

    <section class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">1. Upload File</h3>
      <FileUpload @file-uploaded="handleFileUploaded" />
      <p v-if="uploadedFileName" class="mt-2 text-sm text-gray-500">
        Selected file: <span class="font-medium text-gray-700">{{ uploadedFileName }}</span>
      </p>
    </section>

    <section class="bg-white shadow rounded-lg p-6 space-y-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="text-lg font-medium text-gray-900">2. Or Select an Existing File</h3>
          <p class="text-sm text-gray-500">
            Quickly reopen a previously uploaded workbook. Your protocol decisions stay in the exported file.
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

      <div v-if="storedFilesError" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {{ storedFilesError }}
      </div>

      <div v-else-if="loadingStoredFiles" class="text-sm text-gray-600 flex items-center gap-2">
        <span class="h-4 w-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
        Loading files...
      </div>

      <div v-else-if="availableFiles.length === 0" class="text-sm text-gray-500">
        No stored files yet. Upload a file to populate this list.
      </div>

      <ul v-else class="space-y-3">
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

    <section v-if="sheets.length" class="bg-white shadow rounded-lg p-6 space-y-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-4">3. Select Sheet</h3>
        <div class="space-y-2">
          <label
            v-for="sheet in sheets"
            :key="sheet.name"
            class="flex items-center gap-3"
          >
            <input
              type="radio"
              :value="sheet.name"
              v-model="selectedSheetName"
              class="cursor-pointer"
            />
            <span class="text-sm text-gray-700">
              {{ sheet.name }} <span class="text-gray-500">({{ sheet.rowCount }} rows)</span>
            </span>
          </label>
        </div>
      </div>

      <div v-if="selectedSheetPreview" class="space-y-4">
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-3">4. Choose Header Row</h3>
          <div class="max-w-xs">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Header row
            </label>
            <select
              v-model.number="headerRow"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option
                v-for="rowNumber in availableHeaderRows"
                :key="rowNumber"
                :value="rowNumber"
              >
                Row {{ rowNumber }}
              </option>
            </select>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-sm font-medium text-gray-700">Preview (first 10 rows):</p>
          <div class="overflow-x-auto border border-gray-200 rounded-md max-h-80">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="px-2 py-1 text-left border border-gray-200 bg-gray-50">Row #</th>
                  <th
                    v-for="(_, idx) in (selectedSheetPreview[0]?.cells || [])"
                    :key="idx"
                    class="px-2 py-1 text-left border border-gray-200 bg-gray-50"
                  >
                    Col {{ idx + 1 }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="previewRow in selectedSheetPreview"
                  :key="previewRow.rowNumber"
                  :class="{
                    'bg-green-50 font-semibold': previewRow.rowNumber === headerRow
                  }"
                >
                  <td class="px-2 py-1 border border-gray-200 font-medium">
                    {{ previewRow.rowNumber }}
                    <span
                      v-if="previewRow.rowNumber === headerRow"
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
          <p class="text-xs text-gray-500">
            Confirm the highlighted row contains your column names before loading the sheet.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            @click="fetchSheetData"
            :disabled="!selectedSheetName || loadingSheetData"
            class="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            <span v-if="loadingSheetData" class="flex items-center gap-2">
              <span class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Loading...
            </span>
            <span v-else>Load Sheet Data</span>
          </button>
          <p v-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>
        </div>
      </div>
    </section>

    <section v-if="datasetReady" class="bg-white shadow rounded-lg p-6 space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-end gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            v-model.trim="searchTerm"
            type="text"
            placeholder="Search across all columns..."
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div class="flex gap-3 flex-wrap">
          <button
            type="button"
            @click="toggleFilters"
            class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
          >
            Filters
            <span v-if="activeFilters.length" class="ml-1 text-xs text-green-600 font-semibold">
              ({{ activeFilters.length }})
            </span>
          </button>

          <button
            type="button"
            @click="toggleColumnPanel"
            class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
          >
            Columns
            <span v-if="hiddenColumns.length" class="ml-1 text-xs text-green-600 font-semibold">
              ({{ columns.length - hiddenColumns.length }}/{{ columns.length }})
            </span>
          </button>

          <div class="flex items-end gap-2" v-if="addColumnMode">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">New column name</label>
              <input
                v-model="newColumnName"
                type="text"
                class="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. Protocol"
              />
            </div>
            <div class="flex gap-2 pb-1">
              <button
                type="button"
                @click="confirmAddColumn"
                class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                @click="cancelAddColumn"
                class="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          <button
            v-else
            type="button"
            @click="startAddColumn"
            class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
          >
            Add Column
          </button>

          <button
            type="button"
            @click="downloadExcel"
            :disabled="!rows.length"
            class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            Download Updated Excel
          </button>
        </div>
      </div>

      <p v-if="addColumnError" class="text-sm text-red-600">{{ addColumnError }}</p>

      <div
        v-if="showColumnPanel"
        class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3"
      >
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">Visible columns</label>
            <span class="text-xs text-gray-500">
              {{ columns.length - hiddenColumns.length }} of {{ columns.length }} shown
            </span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="columnSearch"
              type="text"
              placeholder="Search columns..."
              class="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="button"
              @click="showAllColumns"
              class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
            >
              Show all
            </button>
          </div>
        </div>
        <div class="border border-gray-200 rounded-md max-h-56 overflow-auto bg-white divide-y divide-gray-100">
          <label
            v-for="column in filteredColumnOptions"
            :key="`column-toggle-${column}`"
            class="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              :checked="!isColumnHidden(column)"
              @change="toggleColumnVisibility(column)"
            />
            <span class="text-sm text-gray-700 truncate" :title="column">
              {{ column }}
            </span>
          </label>
          <div v-if="!filteredColumnOptions.length" class="px-4 py-3 text-sm text-gray-500">
            No columns match your search.
          </div>
        </div>
        <p v-if="columnPanelError" class="text-sm text-red-600">{{ columnPanelError }}</p>
        <p class="text-xs text-gray-500">
          Hidden columns stay in the export — this only affects what you see on screen.
        </p>
      </div>

      <div
        v-if="showFilterPanel"
        class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4"
      >
        <div class="flex flex-wrap gap-4 items-end">
          <div class="min-w-[200px]">
            <label class="block text-sm font-medium text-gray-700 mb-1">Column</label>
            <select
              v-model="newFilterColumn"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="" disabled>Select column</option>
              <option v-for="column in columns" :key="`filter-${column}`" :value="column">
                {{ column }}
              </option>
            </select>
          </div>

          <div class="min-w-[180px]">
            <label class="block text-sm font-medium text-gray-700 mb-1">Filter type</label>
            <select
              v-model="newFilterMode"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="text">Text match</option>
              <option value="values">Select values</option>
              <option value="empty">Is empty</option>
              <option value="not_empty">Is not empty</option>
            </select>
          </div>

          <template v-if="newFilterMode === 'text'">
            <div class="min-w-[160px]">
              <label class="block text-sm font-medium text-gray-700 mb-1">Match</label>
              <select
                v-model="newFilterOperator"
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
              </select>
            </div>

            <div class="min-w-[220px] flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                v-model="newFilterValue"
                type="text"
                placeholder="Enter filter value"
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </template>

          <button
            type="button"
            @click="addFilter"
            class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 cursor-pointer"
          >
            Add filter
          </button>
        </div>

        <div v-if="newFilterMode === 'values'" class="space-y-3">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <label class="text-sm font-medium text-gray-700">
              Select values for <span class="font-semibold text-gray-900">{{ newFilterColumn || '...' }}</span>
            </label>
            <input
              v-model="valueFilterSearch"
              type="text"
              placeholder="Search values..."
              class="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div class="border border-gray-200 rounded-md max-h-56 overflow-auto bg-white">
            <div
              v-if="!filteredValueOptions.length"
              class="px-4 py-3 text-sm text-gray-500"
            >
              No values found.
            </div>
            <label
              v-for="option in filteredValueOptions"
              :key="`value-filter-${option}`"
              class="flex items-center gap-2 px-4 py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                :value="option"
                v-model="valueFilterSelections"
              />
              <span class="text-sm text-gray-700 truncate">
                {{ formatFilterOption(option) }}
              </span>
            </label>
          </div>
          <div class="text-xs text-gray-500">
            Tip: values include blanks; "(Blank)" represents empty cells.
          </div>
        </div>

        <div v-if="newFilterMode === 'empty' || newFilterMode === 'not_empty'" class="text-xs text-gray-500">
          This filter matches rows where the selected column is {{ newFilterMode === 'empty' ? 'blank' : 'not blank' }}.
        </div>

        <p v-if="filterError" class="text-sm text-red-600">{{ filterError }}</p>
        <div
          v-if="activeFilters.length"
          class="flex flex-wrap items-center gap-2"
        >
          <span class="text-sm font-medium text-gray-700">Active filters:</span>
          <span
            v-for="filter in activeFilters"
            :key="filter.id"
            class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-200"
          >
            {{ formatFilterChip(filter) }}
            <button
              type="button"
              @click="removeFilter(filter.id)"
              class="text-xs text-green-600 hover:text-green-700 font-semibold"
            >
              ✕
            </button>
          </span>
          <button
            type="button"
            @click="clearFilters"
            class="text-sm text-green-700 hover:text-green-800 font-semibold"
          >
            Clear all
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-6 text-sm text-gray-600">
        <div>Total rows: <span class="font-medium text-gray-900">{{ rows.length }}</span></div>
        <div>Visible rows: <span class="font-medium text-gray-900">{{ filteredRows.length }}</span></div>
        <div>
          Protocol — Yes: <span class="font-medium text-green-700">{{ protocolSummary.yes }}</span>,
          No: <span class="font-medium text-red-600">{{ protocolSummary.no }}</span>,
          N/A: <span class="font-medium text-gray-600">{{ protocolSummary.na }}</span>
        </div>
      </div>

      <div class="scroll-container overflow-auto border border-gray-200 rounded-lg max-h-[calc(100vh-220px)]">
        <table class="min-w-max table-auto divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th
                v-for="column in visibleColumns"
                :key="column"
                class="px-3 py-2 text-left font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap"
              >
                <span
                  :title="column"
                  :class="[
                    'block max-w-[180px] truncate',
                    isColumnFiltered(column) ? 'text-green-700 font-semibold' : ''
                  ]"
                >
                  {{ column }}
                </span>
                <span
                  v-if="isProtocolColumn(column)"
                  class="ml-1 text-xs text-green-600 bg-green-50 border border-green-100 rounded px-1 py-0.5"
                >
                  Required
                </span>
              </th>
              <th class="px-3 py-2 text-left font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="row in filteredRows" :key="row.id" class="hover:bg-gray-50">
              <td
                v-for="column in visibleColumns"
                :key="`${row.id}-${column}`"
                class="px-3 py-2 align-top whitespace-nowrap"
              >
                <template v-if="isProtocolColumn(column)">
                  <div class="flex gap-2">
                    <button
                      v-for="option in protocolOptions"
                      :key="option"
                      type="button"
                      @click="setProtocolValue(row, option)"
                      :class="[
                        'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer',
                        getProtocolValue(row) === option
                          ? option === 'No'
                            ? 'bg-red-600 text-white border-red-600'
                            : option === 'Yes'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-gray-700 text-white border-gray-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      ]"
                    >
                      {{ option }}
                    </button>
                  </div>
                </template>
                <template v-else-if="isEditableColumn(column)">
                  <input
                    v-model="row.data[column]"
                    type="text"
                    class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </template>
                <template v-else>
                  <span class="text-gray-800">{{ displayCell(row.data[column]) }}</span>
                </template>
              </td>
              <td class="px-3 py-2">
                <button
                  type="button"
                  @click="deleteRow(row.id)"
                  class="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="!filteredRows.length">
              <td :colspan="visibleColumns.length + 1" class="px-3 py-6 text-center text-sm text-gray-500">
                No rows match your search.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import axios from 'axios';
import * as XLSX from 'xlsx';
import FileUpload from '@/components/FileUpload.vue';
import type { ExcelSheet, ProtocolDataResponse, ProtocolDataRow, UploadResponse, UploadedFile } from '@/types/api';

defineProps<{
  hideHeader?: boolean;
}>();

const uploadedFileId = ref<string | null>(null);
const uploadedFileName = ref<string>('');
const sheets = ref<ExcelSheet[]>([]);
const selectedSheetName = ref<string>('');
const headerRow = ref<number>(1);
const columns = ref<string[]>([]);
const originalColumns = ref<string[]>([]);
const addedColumns = ref<string[]>([]);
const rows = ref<ProtocolDataRow[]>([]);
const loadingSheetData = ref(false);
const loadError = ref<string | null>(null);
const searchTerm = ref('');
const addColumnMode = ref(false);
const newColumnName = ref('Protocol');
const addColumnError = ref<string | null>(null);
const showFilterPanel = ref(false);
const newFilterColumn = ref('');
const newFilterMode = ref<'text' | 'values' | 'empty' | 'not_empty'>('text');
const newFilterOperator = ref<'contains' | 'equals'>('contains');
const newFilterValue = ref('');
const valueFilterSearch = ref('');
const valueFilterSelections = ref<string[]>([]);
const filterError = ref<string | null>(null);
const activeFilters = ref<Array<{
  id: number;
  column: string;
  mode: 'text' | 'values' | 'empty' | 'not_empty';
  operator?: 'contains' | 'equals';
  value?: string;
  values?: string[];
}>>([]);
const filterId = ref(1);
const showColumnPanel = ref(false);
const columnSearch = ref('');
const hiddenColumns = ref<string[]>([]);
const columnPanelError = ref<string | null>(null);
const availableFiles = ref<UploadedFile[]>([]);
const loadingStoredFiles = ref(false);
const loadingStoredFileId = ref<string | null>(null);
const storedFilesError = ref<string | null>(null);
const showAllStoredFiles = ref(false);
const deletingFileId = ref<string | null>(null);

const selectedSheet = computed(() =>
  sheets.value.find(sheet => sheet.name === selectedSheetName.value) ?? null
);

const selectedSheetPreview = computed(() => selectedSheet.value?.preview ?? null);

const availableHeaderRows = computed(() => {
  if (!selectedSheet.value) return [1];
  const maxRow = Math.min(10, selectedSheet.value.totalRows);
  return Array.from({ length: maxRow }, (_, index) => index + 1);
});

const displayedStoredFiles = computed(() => {
  return showAllStoredFiles.value ? availableFiles.value : availableFiles.value.slice(0, 3);
});

const datasetReady = computed(() => columns.value.length > 0 && rows.value.length >= 0);

const uniqueValueOptions = computed(() => {
  if (!newFilterColumn.value) return [];

  const seen = new Set<string>();

  rows.value.forEach(row => {
    const raw = row.data[newFilterColumn.value];
    const value = raw === undefined || raw === null ? '' : String(raw);
    if (!seen.has(value)) {
      seen.add(value);
    }
  });

  const options = Array.from(seen).sort((a, b) => a.localeCompare(b));
  return options;
});

const filteredValueOptions = computed(() => {
  if (!valueFilterSearch.value.trim()) {
    return uniqueValueOptions.value;
  }

  const query = valueFilterSearch.value.trim().toLowerCase();
  return uniqueValueOptions.value.filter(option =>
    option.toLowerCase().includes(query)
  );
});

const filteredRows = computed(() => {
  let result = rows.value;

  if (searchTerm.value.trim()) {
    const query = searchTerm.value.trim().toLowerCase();
    result = result.filter(row =>
      columns.value.some(column => {
        const value = row.data[column];
        return value !== undefined && value !== null && String(value).toLowerCase().includes(query);
      })
    );
  }

  if (activeFilters.value.length) {
    result = result.filter(row =>
      activeFilters.value.every(filter => {
        const rawValue = row.data[filter.column];
        const stringValue = rawValue === undefined || rawValue === null ? '' : String(rawValue);
        const normalizedCell = stringValue.toLowerCase();
        const trimmedCell = stringValue.trim();

        if (filter.mode === 'empty') {
          return trimmedCell === '';
        }

        if (filter.mode === 'not_empty') {
          return trimmedCell !== '';
        }

        if (filter.mode === 'values' && filter.values?.length) {
          const normalizedSet = filter.values.map(value => value.toLowerCase());
          return normalizedSet.includes(normalizedCell);
        }

        if (filter.mode === 'text' && filter.value) {
          const normalizedFilter = filter.value.toLowerCase();
          switch (filter.operator) {
            case 'equals':
              return normalizedCell === normalizedFilter;
            case 'contains':
            default:
              return normalizedCell.includes(normalizedFilter);
          }
        }

        return true;
      })
    );
  }

  return result;
});

const visibleColumns = computed(() =>
  columns.value.filter(column => !hiddenColumns.value.includes(column))
);

const filteredColumnOptions = computed(() => {
  if (!columnSearch.value.trim()) {
    return columns.value;
  }

  const query = columnSearch.value.trim().toLowerCase();
  return columns.value.filter(column => column.toLowerCase().includes(query));
});

const protocolColumnName = computed(() => {
  const existing = columns.value.find(column => column.toLowerCase() === 'protocol');
  return existing ?? 'Protocol';
});

const protocolSummary = computed(() => {
  let yes = 0;
  let no = 0;
  let na = 0;

  rows.value.forEach(row => {
    const status = getProtocolValue(row);
    if (status === 'Yes') {
      yes += 1;
    } else if (status === 'No') {
      no += 1;
    } else {
      na += 1;
    }
  });

  return { yes, no, na };
});

const protocolOptions: Array<'Yes' | 'N/A' | 'No'> = ['Yes', 'N/A', 'No'];

onMounted(async () => {
  await fetchStoredFiles();
});

function applyUploadResponse(data: UploadResponse) {
  uploadedFileId.value = data.fileId;
  uploadedFileName.value = data.fileName;
  sheets.value = data.sheets;
  selectedSheetName.value = data.sheets[0]?.name ?? '';
  headerRow.value = 1;
  columns.value = [];
  originalColumns.value = [];
  addedColumns.value = [];
  rows.value = [];
  loadError.value = null;
  searchTerm.value = '';
  newFilterColumn.value = columns.value[0] ?? '';
  newFilterMode.value = 'text';
  newFilterOperator.value = 'contains';
  newFilterValue.value = '';
  valueFilterSearch.value = '';
  valueFilterSelections.value = [];
  activeFilters.value = [];
  hiddenColumns.value = [];
  showFilterPanel.value = false;
  showColumnPanel.value = false;
  columnSearch.value = '';
}

async function handleFileUploaded(data: UploadResponse) {
  applyUploadResponse(data);
  await fetchStoredFiles();
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
  loadError.value = null;

  try {
    const { data } = await axios.get<UploadResponse>(`/api/upload/files/${fileId}`);
    applyUploadResponse(data);
  } catch (error: any) {
    loadError.value = error.response?.data?.error || error.message || 'Failed to load the stored file.';
    await fetchStoredFiles();
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
    loadError.value = error.response?.data?.error || error.message || 'Failed to delete the stored file.';
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

async function fetchSheetData() {
  if (!uploadedFileId.value || !selectedSheetName.value) {
    loadError.value = 'Please upload a file and select a sheet.';
    return;
  }

  loadingSheetData.value = true;
  loadError.value = null;

  try {
    const response = await axios.post<ProtocolDataResponse>('/api/protocol/data', {
      fileId: uploadedFileId.value,
      sheetName: selectedSheetName.value,
      headerRow: headerRow.value
    });

    const payload = response.data;

    columns.value = [...payload.headers];
    originalColumns.value = [...payload.headers];
    addedColumns.value = [];
    rows.value = payload.rows.map(row => ({
      id: row.id,
      originalRowNumber: row.originalRowNumber,
      data: { ...row.data }
    }));

    ensureProtocolColumn();
    activeFilters.value = activeFilters.value.filter(filter => columns.value.includes(filter.column));
    newFilterColumn.value = columns.value[0] ?? '';
    valueFilterSearch.value = '';
    valueFilterSelections.value = [];
    hiddenColumns.value = [];
    showColumnPanel.value = false;
    columnSearch.value = '';
  } catch (error: any) {
    loadError.value = error.response?.data?.error || error.message || 'Failed to load sheet data.';
  } finally {
    loadingSheetData.value = false;
  }
}

function ensureProtocolColumn() {
  const columnName = protocolColumnName.value;
  if (!columns.value.includes(columnName)) {
    columns.value.push(columnName);
    addedColumns.value.push(columnName);
  } else if (!originalColumns.value.includes(columnName) && !addedColumns.value.includes(columnName)) {
    addedColumns.value.push(columnName);
  }

  rows.value = rows.value.map(row => ({
    ...row,
    data: {
      ...row.data,
      [columnName]: normalizeProtocolValue(row.data[columnName])
    }
  }));
}

function startAddColumn() {
  addColumnMode.value = true;
  addColumnError.value = null;
  newColumnName.value = 'Protocol';
}

function cancelAddColumn() {
  addColumnMode.value = false;
  addColumnError.value = null;
  newColumnName.value = 'Protocol';
}

function confirmAddColumn() {
  const name = newColumnName.value.trim();

  if (!name) {
    addColumnError.value = 'Column name cannot be empty.';
    return;
  }

  const alreadyExists = columns.value.some(column => column.toLowerCase() === name.toLowerCase());
  if (alreadyExists) {
    addColumnError.value = `A column named "${name}" already exists.`;
    return;
  }

  columns.value.push(name);
  addedColumns.value.push(name);
  rows.value = rows.value.map(row => ({
    ...row,
    data: {
      ...row.data,
      [name]: ''
    }
  }));

  addColumnMode.value = false;
  addColumnError.value = null;
  newColumnName.value = 'Protocol';
}

function isProtocolColumn(column: string) {
  return column.toLowerCase() === 'protocol';
}

function isEditableColumn(column: string) {
  return addedColumns.value.includes(column) || isProtocolColumn(column);
}

function displayCell(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}

function deleteRow(rowId: number) {
  rows.value = rows.value.filter(row => row.id !== rowId);
}

function downloadExcel() {
  // Use filtered rows and visible columns to match what's shown in the table
  const rowsToExport = filteredRows.value;
  const columnsToExport = visibleColumns.value;

  if (!columnsToExport.length || !rowsToExport.length) {
    alert('No data to export. Please ensure you have visible rows and columns.');
    return;
  }

  const sheetData = rowsToExport.map(row => {
    const record: Record<string, any> = {};
    columnsToExport.forEach(column => {
      record[column] = row.data[column] ?? '';
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: columnsToExport });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, selectedSheetName.value || 'Protocol');

  const baseName = uploadedFileName.value.replace(/\.[^.]+$/, '') || 'protocol-check';
  const fileName = `${baseName}-review.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

function normalizeProtocolValue(value: unknown): 'Yes' | 'No' | 'N/A' {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'yes') return 'Yes';
  if (normalized === 'no') return 'No';
  if (normalized === 'n/a' || normalized === 'na') return 'N/A';
  return 'N/A';
}

function getProtocolValue(row: ProtocolDataRow): 'Yes' | 'No' | 'N/A' {
  const columnName = protocolColumnName.value;
  return normalizeProtocolValue(row.data[columnName]);
}

function setProtocolValue(row: ProtocolDataRow, status: 'Yes' | 'No' | 'N/A') {
  const columnName = protocolColumnName.value;
  row.data = {
    ...row.data,
    [columnName]: status
  };
}

function toggleFilters() {
  showFilterPanel.value = !showFilterPanel.value;
  if (showFilterPanel.value && !newFilterColumn.value) {
    newFilterColumn.value = columns.value[0] ?? '';
  }
  filterError.value = null;
  valueFilterSearch.value = '';
}

function addFilter() {
  filterError.value = null;

  if (!newFilterColumn.value) {
    filterError.value = 'Please choose a column to filter.';
    return;
  }

  if (newFilterMode.value === 'text') {
    if (!newFilterValue.value.trim()) {
      filterError.value = 'Filter value cannot be empty.';
      return;
    }

    activeFilters.value.push({
      id: filterId.value++,
      column: newFilterColumn.value,
      mode: 'text',
      operator: newFilterOperator.value,
      value: newFilterValue.value.trim()
    });

    newFilterValue.value = '';
  } else if (newFilterMode.value === 'values') {
    if (!valueFilterSelections.value.length) {
      filterError.value = 'Select at least one value.';
      return;
    }

    activeFilters.value.push({
      id: filterId.value++,
      column: newFilterColumn.value,
      mode: 'values',
      values: [...valueFilterSelections.value]
    });

    valueFilterSelections.value = [];
  } else {
    activeFilters.value.push({
      id: filterId.value++,
      column: newFilterColumn.value,
      mode: newFilterMode.value
    });
  }

  valueFilterSearch.value = '';
}

function removeFilter(id: number) {
  activeFilters.value = activeFilters.value.filter(filter => filter.id !== id);
}

function clearFilters() {
  activeFilters.value = [];
}

function isColumnFiltered(column: string) {
  return activeFilters.value.some(filter => filter.column === column);
}

function toggleColumnPanel() {
  showColumnPanel.value = !showColumnPanel.value;
  columnPanelError.value = null;
  if (showColumnPanel.value) {
    columnSearch.value = '';
  }
}

function isColumnHidden(column: string) {
  return hiddenColumns.value.includes(column);
}

function toggleColumnVisibility(column: string) {
  columnPanelError.value = null;

  if (hiddenColumns.value.includes(column)) {
    hiddenColumns.value = hiddenColumns.value.filter(item => item !== column);
    return;
  }

  if (visibleColumns.value.length <= 1) {
    columnPanelError.value = 'At least one column must remain visible.';
    return;
  }

  hiddenColumns.value = [...hiddenColumns.value, column];
}

function showAllColumns() {
  hiddenColumns.value = [];
  columnPanelError.value = null;
}

function formatFilterOption(value: string) {
  return value ? value : '(Blank)';
}

function formatFilterChip(filter: {
  column: string;
  mode: 'text' | 'values' | 'empty' | 'not_empty';
  operator?: 'contains' | 'equals';
  value?: string;
  values?: string[];
}) {
  if (filter.mode === 'values') {
    const values = filter.values?.length
      ? filter.values.map(formatFilterOption).join(', ')
      : 'Any';
    return `${filter.column} ∈ [${values}]`;
  }

  if (filter.mode === 'empty') {
    return `${filter.column} is empty`;
  }

  if (filter.mode === 'not_empty') {
    return `${filter.column} is not empty`;
  }

  const operatorSymbol = filter.operator === 'equals' ? '=' : 'contains';
  return `${filter.column} ${operatorSymbol} "${filter.value ?? ''}"`;
}

watch(newFilterColumn, () => {
  valueFilterSelections.value = [];
  valueFilterSearch.value = '';
  filterError.value = null;
});

watch(newFilterMode, () => {
  newFilterValue.value = '';
  valueFilterSelections.value = [];
  valueFilterSearch.value = '';
  filterError.value = null;
});

watch(columns, () => {
  hiddenColumns.value = hiddenColumns.value.filter(column => columns.value.includes(column));

  if (!columns.value.includes(newFilterColumn.value)) {
    newFilterColumn.value = columns.value[0] ?? '';
  }

  if (visibleColumns.value.length === 0 && columns.value.length) {
    hiddenColumns.value = [];
  }

  columnPanelError.value = null;
});

watch(hiddenColumns, newHidden => {
  if (visibleColumns.value.length === 0 && columns.value.length) {
    const truncated = newHidden.slice(0, Math.max(0, newHidden.length - 1));
    hiddenColumns.value = truncated;
    columnPanelError.value = 'At least one column must remain visible.';
  }
});
</script>

<style scoped>
table {
  border-collapse: separate;
  border-spacing: 0;
}

.scroll-container {
  scrollbar-gutter: stable;
}

.scroll-container::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-container::-webkit-scrollbar-thumb {
  background-color: rgba(107, 114, 128, 0.5);
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.scroll-container:hover::-webkit-scrollbar-thumb {
  background-color: rgba(34, 197, 94, 0.7);
}

.scroll-container::-webkit-scrollbar-corner {
  background: transparent;
}

.scroll-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(107, 114, 128, 0.5) transparent;
}
</style>


