<template>
  <div class="space-y-4">
    <!-- Search Bar -->
    <div class="mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search files and folders..."
        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
    </div>

    <!-- Breadcrumb Navigation -->
    <div class="flex items-center gap-2 text-sm">
      <button
        @click="navigateToPath('')"
        class="text-blue-600 hover:text-blue-800 cursor-pointer"
      >
        Home
      </button>
      <span v-if="currentPath" class="text-gray-400">/</span>
      <template v-for="(part, index) in pathParts" :key="index">
        <button
          @click="navigateToPath(getPathUpTo(index))"
          class="text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          {{ part }}
        </button>
        <span v-if="index < pathParts.length - 1" class="text-gray-400">/</span>
      </template>
    </div>

    <!-- File List -->
    <div v-if="loading" class="text-center py-8 text-gray-500">
      Loading...
    </div>
    <div v-else-if="items.length === 0" class="text-center py-8 text-gray-500">
      This folder is empty
    </div>
    <div v-else class="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50 sticky top-0">
          <tr>
            <th class="px-4 py-2 text-left">
              <input
                type="checkbox"
                :checked="allFilesSelected"
                @change="toggleSelectAll"
                class="rounded border-gray-300"
              />
            </th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Modified</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="filteredItems.length === 0 && searchQuery.trim()">
            <td colspan="4" class="px-4 py-8 text-center text-gray-500">
              No files or folders match "{{ searchQuery }}"
            </td>
          </tr>
          <tr
            v-else
            v-for="item in filteredItems"
            :key="item.path"
            class="hover:bg-gray-50"
            :class="{ 'bg-blue-50': isSelected(item) }"
          >
            <td class="px-4 py-2" @click.stop>
              <input
                v-if="!item.isDirectory"
                type="checkbox"
                :checked="isSelected(item)"
                @change="toggleSelect(item)"
                class="rounded border-gray-300 cursor-pointer"
              />
            </td>
            <td class="px-4 py-2">
              <div class="flex items-center gap-2">
                <span class="text-lg">
                  {{ item.isDirectory ? '📁' : '📄' }}
                </span>
                <button
                  v-if="item.isDirectory"
                  @click="navigateToPath(item.path)"
                  class="text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {{ item.name }}
                </button>
                <span v-else class="text-gray-900">{{ item.name }}</span>
              </div>
            </td>
            <td class="px-4 py-2 text-sm text-gray-500">
              {{ item.isDirectory ? '-' : formatFileSize(item.size) }}
            </td>
            <td class="px-4 py-2 text-sm text-gray-500">
              {{ formatDate(item.modified) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedFiles.length > 0" class="mt-4 p-3 bg-blue-50 rounded-md">
      <p class="text-sm text-blue-800">
        {{ selectedFiles.length }} file(s) selected
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';

const props = defineProps<{
  selectedFiles?: any[];
}>();

const emit = defineEmits<{
  (e: 'file-selected', files: any[]): void;
}>();

const currentPath = ref('');
const items = ref<any[]>([]);
const loading = ref(false);
const selectedFiles = ref<any[]>([]);
const searchQuery = ref('');
const allItems = ref<any[]>([]); // Store all items for filtering

const pathParts = computed(() => {
  if (!currentPath.value) return [];
  return currentPath.value.split('/').filter(p => p);
});

const allFilesSelected = computed(() => {
  const files = filteredItems.value.filter(item => !item.isDirectory);
  return files.length > 0 && files.every(file => isSelected(file));
});

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return items.value;
  }
  
  const query = searchQuery.value.toLowerCase().trim();
  return items.value.filter(item => {
    return item.name.toLowerCase().includes(query);
  });
});

function getPathUpTo(index: number): string {
  if (index < 0) return '';
  return pathParts.value.slice(0, index + 1).join('/');
}

function isSelected(item: any): boolean {
  return selectedFiles.value.some(f => f.path === item.path);
}

function toggleSelect(item: any) {
  if (item.isDirectory) return;
  
  const index = selectedFiles.value.findIndex(f => f.path === item.path);
  if (index >= 0) {
    selectedFiles.value.splice(index, 1);
  } else {
    selectedFiles.value.push(item);
  }
  emit('file-selected', selectedFiles.value);
}

function toggleSelectAll() {
  const files = filteredItems.value.filter(item => !item.isDirectory);
  if (allFilesSelected.value) {
    // Deselect all
    selectedFiles.value = selectedFiles.value.filter(f => 
      !files.some(file => file.path === f.path)
    );
  } else {
    // Select all
    files.forEach(file => {
      if (!isSelected(file)) {
        selectedFiles.value.push(file);
      }
    });
  }
  emit('file-selected', selectedFiles.value);
}

async function loadFiles() {
  loading.value = true;
  try {
    const response = await axios.get('/api/storage', {
      params: { folderPath: currentPath.value }
    });
    items.value = response.data.items || [];
    allItems.value = items.value;
    
    // Save current path to localStorage
    if (currentPath.value) {
      localStorage.setItem('storageBrowser_currentPath', currentPath.value);
    } else {
      localStorage.removeItem('storageBrowser_currentPath');
    }
  } catch (error: any) {
    console.error('Error loading files:', error);
    alert('Error loading files: ' + (error.response?.data?.error || error.message));
  } finally {
    loading.value = false;
  }
}

function navigateToPath(path: string) {
  currentPath.value = path;
  loadFiles();
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Watch for prop changes
watch(() => props.selectedFiles, (newVal) => {
  if (newVal) {
    selectedFiles.value = [...newVal];
  }
}, { immediate: true });

onMounted(() => {
  // Load saved path from localStorage
  const savedPath = localStorage.getItem('storageBrowser_currentPath');
  if (savedPath) {
    currentPath.value = savedPath;
  }
  loadFiles();
});
</script>
