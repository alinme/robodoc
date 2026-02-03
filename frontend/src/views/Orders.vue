<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold text-gray-900">Orders</h2>
        <p class="mt-1 text-sm text-gray-500">Upload Excel files with orders, filter by region, and manage schools</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="!showUploadSection"
          @click="showUploadSection = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
        >
          Upload Excel Order
        </button>
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
        >
          Create New Order
        </button>
      </div>
    </div>

    <!-- Excel Upload Section -->
    <div v-if="showUploadSection" class="bg-white shadow rounded-lg p-6 mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-gray-900">Upload Excel File with Orders</h3>
        <button
          @click="closeUploadSection"
          class="text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- Step 1: Upload File -->
      <div v-if="uploadStep === 1" class="space-y-4">
        <FileUpload @file-uploaded="handleFileUploaded" />
        <p class="text-sm text-gray-500">
          Upload an Excel file containing school orders. The file should have columns like: School Name, City, State, Address, etc.
        </p>
      </div>

      <!-- Step 2: Select Sheet and Header Row -->
      <div v-if="uploadStep === 2 && uploadedFile" class="space-y-4">
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-2">Select Sheet</h4>
          <div class="space-y-2">
            <label
              v-for="sheet in sheets"
              :key="sheet.name"
              class="flex items-center cursor-pointer"
            >
              <input
                type="radio"
                :value="sheet.name"
                v-model="selectedSheet"
                @change="onSheetSelected"
                class="mr-2"
              />
              <span>{{ sheet.name }} ({{ sheet.rowCount }} rows, {{ sheet.headers.length }} columns)</span>
            </label>
          </div>
        </div>

        <div v-if="selectedSheet && selectedSheetData" class="mt-4">
          <h4 class="text-md font-medium text-gray-900 mb-2">Select Header Row</h4>
          <select
            v-model="headerRow"
            @change="onHeaderRowChanged"
            class="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2"
          >
            <option v-for="row in availableHeaderRows" :key="row" :value="row">
              Row {{ row }}
            </option>
          </select>

          <div v-if="currentHeaders.length > 0" class="mt-4">
            <p class="text-sm font-medium text-gray-700 mb-2">Detected Columns:</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="header in currentHeaders"
                :key="header"
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
              >
                {{ header }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="currentHeaders.length > 0" class="flex justify-end gap-2 mt-4">
          <button
            @click="uploadStep = 1"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
          >
            Back
          </button>
          <button
            @click="loadSheetData"
            :disabled="!selectedSheet || loadingSheetData"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ loadingSheetData ? 'Loading...' : 'Load Data' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Filter and Select Rows -->
      <div v-if="uploadStep === 3 && sheetData.length > 0" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Filter by State</label>
            <select
              v-model="filterState"
              @change="applyFilters"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All States</option>
              <option v-for="state in uniqueStates" :key="state" :value="state">
                {{ state }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Filter by City</label>
            <select
              v-model="filterCity"
              @change="applyFilters"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Cities</option>
              <option v-for="city in filteredCities" :key="city" :value="city">
                {{ city }}
              </option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              @click="selectAllFiltered"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Select All ({{ filteredRows.length }})
            </button>
          </div>
        </div>

        <div class="bg-gray-50 p-3 rounded-md">
          <p class="text-sm text-gray-700">
            <span class="font-medium">{{ selectedRowsCount }}</span> of 
            <span class="font-medium">{{ filteredRows.length }}</span> rows selected
            <span v-if="filteredRows.length < sheetData.length" class="text-gray-500">
              (filtered from {{ sheetData.length }} total)
            </span>
          </p>
        </div>

        <div class="max-h-96 overflow-auto border border-gray-200 rounded-md">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left border-b">
                  <input
                    type="checkbox"
                    :checked="allFilteredSelected"
                    @change="toggleAllFiltered"
                    class="rounded"
                  />
                </th>
                <th
                  v-for="header in currentHeaders"
                  :key="header"
                  class="px-3 py-2 text-left border-b font-medium text-gray-700"
                >
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in filteredRows"
                :key="index"
                :class="{ 'bg-blue-50': row.selected }"
                class="hover:bg-gray-50"
              >
                <td class="px-3 py-2 border-b">
                  <input
                    type="checkbox"
                    v-model="row.selected"
                    class="rounded"
                  />
                </td>
                <td
                  v-for="header in currentHeaders"
                  :key="header"
                  class="px-3 py-2 border-b text-gray-700"
                >
                  {{ row.data[header] || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end gap-2">
          <button
            @click="uploadStep = 2"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
          >
            Back
          </button>
          <button
            @click="proceedToOrderCreation"
            :disabled="selectedRowsCount === 0"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Create Order from Selected ({{ selectedRowsCount }})
          </button>
        </div>
      </div>

      <!-- Step 4: Map Columns -->
      <div v-if="uploadStep === 4" class="space-y-4">
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-2">Map Excel Columns to School Fields</h4>
          <p class="text-sm text-gray-500 mb-4">
            Select which Excel columns correspond to each school field. Required fields are marked with *.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              School Name *
            </label>
            <select
              v-model="columnMapping.name"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              School Address *
            </label>
            <select
              v-model="columnMapping.address"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <select
              v-model="columnMapping.city"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              State / Region
            </label>
            <select
              v-model="columnMapping.state"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Contact Person Name
            </label>
            <select
              v-model="columnMapping.contact_name"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              CP Number (Contact Phone)
            </label>
            <select
              v-model="columnMapping.contact_phone"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              CP Email (Contact Email)
            </label>
            <select
              v-model="columnMapping.contact_email"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Final Number of Kits
            </label>
            <select
              v-model="columnMapping.kits_count"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Medium (City Type)
            </label>
            <select
              v-model="columnMapping.city_type"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Expected values: rural, urban big, urban small, urban
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Protocol Number
            </label>
            <select
              v-model="columnMapping.protocol_number"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Column --</option>
              <option v-for="header in currentHeaders" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="uploadStep = 3"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
          >
            Back
          </button>
          <button
            @click="proceedToOrderName"
            :disabled="!canProceedToOrderName"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Next: Create Order
          </button>
        </div>
      </div>

      <!-- Step 5: Create Order -->
      <div v-if="uploadStep === 5" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Order Name *</label>
          <input
            v-model="newOrderFromExcel.name"
            type="text"
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="e.g., Order 3"
          />
        </div>
        <div class="bg-gray-50 p-3 rounded-md">
          <p class="text-sm text-gray-700">
            Ready to create order with <span class="font-medium">{{ selectedRowsCount }}</span> schools
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <button
            @click="uploadStep = 4"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
          >
            Back
          </button>
          <button
            @click="createOrderFromExcel"
            :disabled="!newOrderFromExcel.name || creatingOrderFromExcel"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ creatingOrderFromExcel ? 'Creating...' : 'Create Order' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">
      Loading orders...
    </div>

    <div v-else-if="orders.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
      <p class="text-gray-500 mb-4">No orders yet. Create your first order to get started.</p>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
      >
        Create Order
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="order in orders"
        :key="order.id"
        class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
        @click="viewOrder(order.id)"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-semibold text-gray-900">{{ order.name }}</h3>
          <span
            class="px-2 py-1 text-xs font-medium rounded"
            :class="{
              'bg-gray-100 text-gray-800': order.status === 'draft',
              'bg-blue-100 text-blue-800': order.status === 'planned',
              'bg-yellow-100 text-yellow-800': order.status === 'in-progress',
              'bg-green-100 text-green-800': order.status === 'completed',
              'bg-red-100 text-red-800': order.status === 'cancelled'
            }"
          >
            {{ order.status }}
          </span>
        </div>
          <div class="space-y-2 text-sm text-gray-600">
            <div v-if="order.delivery_month || order.delivery_year" class="flex items-start">
              <span class="font-medium mr-2">Delivery:</span>
              <span>{{ formatDeliveryDate(order.delivery_month, order.delivery_year) }}</span>
            </div>
            <div class="flex items-center justify-between pt-2 border-t">
              <span>{{ order.school_count || 0 }} Schools</span>
              <span>{{ order.total_kits || 0 }} Kits</span>
            </div>
          </div>
        <div class="mt-4 flex gap-2">
          <button
            @click.stop="viewOrder(order.id)"
            class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer text-sm"
          >
            View
          </button>
          <button
            @click.stop="exportOrder(order.id)"
            class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-sm"
          >
            Export
          </button>
          <button
            @click.stop="deleteOrderHandler(order)"
            class="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 cursor-pointer text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Create Order Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showCreateModal = false"
    >
      <div class="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Create New Order</h3>
          <button
            @click="showCreateModal = false"
            class="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleCreateOrder" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Order Name *</label>
            <input
              v-model="newOrder.name"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., Order 3"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Month</label>
              <select
                v-model="newOrder.delivery_month"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option :value="null">-- Select Month --</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Year</label>
              <input
                v-model.number="newOrder.delivery_year"
                type="number"
                min="2020"
                max="2100"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 2024"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select v-model="newOrder.status" class="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="draft">Draft</option>
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              v-model="newOrder.notes"
              rows="3"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Additional notes..."
            />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="creating"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ creating ? 'Creating...' : 'Create Order' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useOrdersStore } from '@/stores/orders';
import FileUpload from '@/components/FileUpload.vue';
import axios from 'axios';
import type { Order } from '@/types/order';
import type { ExcelSheet, UploadResponse } from '@/types/api';
import * as XLSX from 'xlsx';

const router = useRouter();
const ordersStore = useOrdersStore();

const orders = computed(() => ordersStore.orders);
const loading = computed(() => ordersStore.loading);

const showCreateModal = ref(false);
const creating = ref(false);
const newOrder = ref<Partial<Order>>({
  name: '',
  delivery_month: null,
  delivery_year: null,
  status: 'draft',
  notes: null
});

// Excel Upload State
const showUploadSection = ref(false);
const uploadStep = ref(1); // 1: upload, 2: select sheet, 3: filter/select rows, 4: create order
const uploadedFile = ref<string | null>(null);
const sheets = ref<ExcelSheet[]>([]);
const selectedSheet = ref<string | null>(null);
const selectedSheetData = ref<ExcelSheet | null>(null);
const headerRow = ref<number>(1);
const currentHeaders = ref<string[]>([]);
const sheetData = ref<Array<{ data: Record<string, any>; selected: boolean }>>([]);
const loadingSheetData = ref(false);
const filterState = ref('');
const filterCity = ref('');
const columnMapping = ref<{
  name: string;
  address: string;
  city: string;
  state: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  kits_count: string;
  city_type: string;
  protocol_number: string;
}>({
  name: '',
  address: '',
  city: '',
  state: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  kits_count: '',
  city_type: '',
  protocol_number: ''
});
const newOrderFromExcel = ref({ name: '' });
const creatingOrderFromExcel = ref(false);

function formatDeliveryDate(month: string | null, year: number | null) {
  if (!month && !year) return '';
  if (month && year) return `${month} ${year}`;
  if (month) return month;
  if (year) return year.toString();
  return '';
}

function viewOrder(orderId: number) {
  router.push(`/orders/${orderId}`);
}

async function handleCreateOrder() {
  if (!newOrder.value.name?.trim()) {
    alert('Order name is required');
    return;
  }

  creating.value = true;
  try {
    await ordersStore.createOrder(newOrder.value);
    showCreateModal.value = false;
    newOrder.value = {
      name: '',
      delivery_month: null,
      delivery_year: null,
      status: 'draft',
      notes: null
    };
  } catch (error: any) {
    alert('Error creating order: ' + (error.message || error));
  } finally {
    creating.value = false;
  }
}

async function deleteOrderHandler(order: Order) {
  if (!confirm(`Are you sure you want to delete "${order.name}"? This will also delete all schools and structures in this order.`)) {
    return;
  }

  try {
    await ordersStore.deleteOrder(order.id);
  } catch (error: any) {
    alert('Error deleting order: ' + (error.message || error));
  }
}

async function exportOrder(orderId: number) {
  try {
    const data = await ordersStore.exportOrder(orderId, 'xlsx');
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Order sheet
    const orderData = [
      ['Order Name', data.order.name],
      ['Delivery Month', data.order.delivery_month || ''],
      ['Delivery Year', data.order.delivery_year || ''],
      ['Status', data.order.status],
      ['Notes', data.order.notes || '']
    ];
    const orderWs = XLSX.utils.aoa_to_sheet(orderData);
    XLSX.utils.book_append_sheet(wb, orderWs, 'Order');

    // Schools sheet
    const schoolsData = data.schools.map((school: any) => ({
      'School Name': school.name,
      'Address': school.address,
      'City': school.city,
      'Contact Name': school.contact_name || '',
      'Contact Phone': school.contact_phone || '',
      'Contact Email': school.contact_email || '',
      'Kits Count': school.kits_count || 0,
      'City Type': school.city_type || '',
      'Delivery Group': school.delivery_group_name || '',
      'Calculated Kits': school.calculated_kits || 0,
      'Structures': (school.structures || []).map((s: any) => `${s.name} (${s.kits_count})`).join(', ')
    }));
    const schoolsWs = XLSX.utils.json_to_sheet(schoolsData);
    XLSX.utils.book_append_sheet(wb, schoolsWs, 'Schools');

    // Structures sheet
    const structuresData: any[] = [];
    data.schools.forEach((school: any) => {
      (school.structures || []).forEach((structure: any) => {
        structuresData.push({
          'School Name': school.name,
          'Structure Name': structure.name,
          'Address': structure.address || '',
          'Kits Count': structure.kits_count || 0
        });
      });
    });
    const structuresWs = XLSX.utils.json_to_sheet(structuresData);
    XLSX.utils.book_append_sheet(wb, structuresWs, 'Structures');

    // Write file
    XLSX.writeFile(wb, `Order_${data.order.name.replace(/\s+/g, '_')}.xlsx`);
  } catch (error: any) {
    alert('Error exporting order: ' + (error.message || error));
  }
}

// Computed properties for filtering
const availableHeaderRows = computed(() => {
  if (!selectedSheetData.value) return [1];
  const maxRow = Math.min(10, selectedSheetData.value.totalRows);
  return Array.from({ length: maxRow }, (_, i) => i + 1);
});

const getStateColumn = () => {
  return columnMapping.value.state || 
         currentHeaders.value.find(h => 
           ['state', 'region', 'regiune', 'judet', 'județ'].some(p => h.toLowerCase().includes(p))
         ) || '';
};

const getCityColumn = () => {
  return columnMapping.value.city || 
         currentHeaders.value.find(h => 
           ['city', 'oraș', 'oras', 'municipiu'].some(p => h.toLowerCase().includes(p))
         ) || '';
};

const uniqueStates = computed(() => {
  const states = new Set<string>();
  const stateCol = getStateColumn();
  if (!stateCol) return [];
  sheetData.value.forEach(row => {
    const state = row.data[stateCol];
    if (state) states.add(String(state));
  });
  return Array.from(states).sort();
});

const filteredCities = computed(() => {
  const cities = new Set<string>();
  const cityCol = getCityColumn();
  const stateCol = getStateColumn();
  if (!cityCol) return [];
  sheetData.value.forEach(row => {
    if (filterState.value && stateCol) {
      const state = row.data[stateCol];
      if (String(state) !== filterState.value) return;
    }
    const city = row.data[cityCol];
    if (city) cities.add(String(city));
  });
  return Array.from(cities).sort();
});

const filteredRows = computed(() => {
  const stateCol = getStateColumn();
  const cityCol = getCityColumn();
  return sheetData.value.filter(row => {
    if (filterState.value && stateCol) {
      const state = row.data[stateCol];
      if (String(state) !== filterState.value) return false;
    }
    if (filterCity.value && cityCol) {
      const city = row.data[cityCol];
      if (String(city) !== filterCity.value) return false;
    }
    return true;
  });
});

const selectedRowsCount = computed(() => {
  return filteredRows.value.filter(row => row.selected).length;
});

const allFilteredSelected = computed(() => {
  return filteredRows.value.length > 0 && filteredRows.value.every(row => row.selected);
});

const canProceedToOrderName = computed(() => {
  return !!(columnMapping.value.name && columnMapping.value.address && columnMapping.value.city);
});

// Excel Upload Functions
function closeUploadSection() {
  showUploadSection.value = false;
  uploadStep.value = 1;
  uploadedFile.value = null;
  sheets.value = [];
  selectedSheet.value = null;
  selectedSheetData.value = null;
  headerRow.value = 1;
  currentHeaders.value = [];
  sheetData.value = [];
  filterState.value = '';
  filterCity.value = '';
  columnMapping.value = {
    name: '',
    address: '',
    city: '',
    state: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    kits_count: '',
    city_type: '',
    protocol_number: ''
  };
  newOrderFromExcel.value = { name: '' };
}

async function handleFileUploaded(data: UploadResponse) {
  uploadedFile.value = data.fileId;
  sheets.value = data.sheets;
  selectedSheet.value = null;
  selectedSheetData.value = null;
  headerRow.value = 1;
  currentHeaders.value = [];
  uploadStep.value = 2;
}

function onSheetSelected() {
  if (selectedSheet.value) {
    selectedSheetData.value = sheets.value.find(s => s.name === selectedSheet.value) || null;
    headerRow.value = 1;
    onHeaderRowChanged();
  }
}

function onHeaderRowChanged() {
  if (!selectedSheetData.value) return;
  
  const headerRowData = selectedSheetData.value.preview.find(r => r.rowNumber === headerRow.value);
  if (!headerRowData) return;
  
  currentHeaders.value = headerRowData.cells;
}

async function loadSheetData() {
  if (!uploadedFile.value || !selectedSheet.value) return;
  
  loadingSheetData.value = true;
  try {
    const response = await axios.post('/api/upload/parse', {
      fileId: uploadedFile.value,
      sheetName: selectedSheet.value,
      headerRow: headerRow.value
    });
    
    // Transform data into our format
    sheetData.value = response.data.rows.map((row: any) => ({
      data: row.data,
      selected: false
    }));
    
    // Auto-detect column mappings
    autoDetectColumnMappings();
    
    uploadStep.value = 3;
  } catch (error: any) {
    alert('Error loading sheet data: ' + (error.response?.data?.error || error.message));
  } finally {
    loadingSheetData.value = false;
  }
}

function autoDetectColumnMappings() {
  const headers = currentHeaders.value.map(h => h.toLowerCase());
  
  // Try to auto-detect common column names
  const detect = (patterns: string[]) => {
    for (const pattern of patterns) {
      const found = headers.findIndex(h => h.includes(pattern));
      if (found !== -1) return currentHeaders.value[found];
    }
    return '';
  };
  
  columnMapping.value = {
    name: detect(['school', 'nume', 'name']),
    address: detect(['address', 'adresa', 'adresă']),
    city: detect(['city', 'oraș', 'oras', 'municipiu']),
    state: detect(['state', 'region', 'regiune', 'judet', 'județ']),
    contact_name: detect(['contact', 'person', 'persoană', 'cp name']),
    contact_phone: detect(['phone', 'telefon', 'tel', 'cp number', 'number']),
    contact_email: detect(['email', 'e-mail', 'cp email']),
    kits_count: detect(['kits', 'kit', 'final number', 'number of kits', 'kids']),
    city_type: detect(['medium', 'type', 'tip', 'urban', 'rural']),
    protocol_number: detect(['protocol', 'contract'])
  };
}

function applyFilters() {
  // Filters are applied via computed property
}

function selectAllFiltered() {
  filteredRows.value.forEach(row => {
    row.selected = true;
  });
}

function toggleAllFiltered(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  filteredRows.value.forEach(row => {
    row.selected = checked;
  });
}

function proceedToOrderCreation() {
  if (selectedRowsCount.value === 0) {
    alert('Please select at least one row');
    return;
  }
  uploadStep.value = 4;
}

function proceedToOrderName() {
  if (!canProceedToOrderName.value) {
    alert('Please map at least School Name, Address, and City columns');
    return;
  }
  uploadStep.value = 5;
}

async function createOrderFromExcel() {
  if (!newOrderFromExcel.value.name?.trim()) {
    alert('Order name is required');
    return;
  }
  
  if (selectedRowsCount.value === 0) {
    alert('Please select at least one school');
    return;
  }
  
  creatingOrderFromExcel.value = true;
  try {
    // Create the order first
    const order = await ordersStore.createOrder({
      name: newOrderFromExcel.value.name,
      status: 'draft'
    });
    
    // Get selected rows
    const selectedRows = filteredRows.value.filter(row => row.selected);
    
    // Create schools from selected rows using column mapping
    for (const row of selectedRows) {
      const getValue = (column: string) => {
        if (!column) return '';
        return row.data[column] || '';
      };
      
      const normalizeCityType = (value: string): string | null => {
        if (!value) return null;
        const lower = String(value).toLowerCase().trim();
        if (lower.includes('rural')) return 'rural';
        if (lower.includes('urban big') || lower.includes('urban large')) return 'urban-large';
        if (lower.includes('urban small')) return 'urban-small';
        if (lower.includes('urban')) return 'urban';
        return lower;
      };
      
      const schoolData: any = {
        name: getValue(columnMapping.value.name),
        city: getValue(columnMapping.value.city),
        address: getValue(columnMapping.value.address),
        contact_name: getValue(columnMapping.value.contact_name) || null,
        contact_phone: getValue(columnMapping.value.contact_phone) || null,
        contact_email: getValue(columnMapping.value.contact_email) || null,
        city_type: normalizeCityType(getValue(columnMapping.value.city_type)),
        protocol_number: getValue(columnMapping.value.protocol_number) || null,
        kits_count: parseInt(getValue(columnMapping.value.kits_count)) || 0
      };
      
      if (schoolData.name && schoolData.city && schoolData.address) {
        await ordersStore.createSchool(order.id, schoolData);
      }
    }
    
    // Close upload section and refresh orders
    closeUploadSection();
    await ordersStore.fetchOrders();
    
    // Navigate to the new order
    router.push(`/orders/${order.id}`);
  } catch (error: any) {
    alert('Error creating order: ' + (error.message || error));
  } finally {
    creatingOrderFromExcel.value = false;
  }
}

onMounted(async () => {
  await ordersStore.fetchOrders();
});
</script>

