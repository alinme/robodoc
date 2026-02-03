<template>
  <div class="space-y-6">
    <!-- Header Actions -->
    <div class="bg-white shadow rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 class="text-lg font-medium text-gray-900">File Storage</h3>
          <p class="text-sm text-gray-500 mt-1">
            Current folder: <span class="font-mono">{{ currentPath || '/' }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="showCreateFolderModal = true"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
          >
            + New Folder
          </button>
          <button
            @click="fileInputRef?.click()"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
          >
            + Upload Files
          </button>
          <button
            @click="folderInputRef?.click()"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer"
          >
            📁 Upload Folder
          </button>
        </div>
      </div>

      <!-- Drag and Drop Zone -->
      <div
        @drop.prevent="handleDrop"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @dragenter.prevent
        @click="!uploading && fileInputRef?.click()"
        :class="[
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4',
          dragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50',
          uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
      >
        <div v-if="!uploading">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <p class="mt-2 text-sm text-gray-600">
            <span class="font-medium text-purple-600">Drag and drop</span> files or folders here
          </p>
          <p class="text-xs text-gray-500 mt-1">
            Or click the buttons above to upload files or folders
          </p>
        </div>
        <div v-else class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span class="ml-3 text-gray-600">Uploading...</span>
        </div>
      </div>

      <!-- Breadcrumb Navigation -->
      <div class="flex items-center gap-2 text-sm mb-4">
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

      <input
        ref="fileInputRef"
        type="file"
        multiple
        @change="handleFileSelect"
        class="hidden"
      />
      <input
        ref="folderInputRef"
        type="file"
        webkitdirectory
        directory
        multiple
        @change="handleFolderSelect"
        class="hidden"
      />
    </div>

    <!-- File List -->
    <div class="bg-white shadow rounded-lg p-6">
      <div v-if="loading" class="text-center py-8 text-gray-500">
        Loading...
      </div>
      <div v-else-if="items.length === 0" class="text-center py-8 text-gray-500">
        This folder is empty
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modified
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="item in items"
              :key="item.path"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <span class="text-lg">
                    {{ item.isDirectory ? '📁' : '📄' }}
                  </span>
                  <button
                    v-if="item.isDirectory"
                    @click="navigateToPath(item.path)"
                    class="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                  >
                    {{ item.name }}
                  </button>
                  <span 
                    v-else 
                    class="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                    @dblclick="startRename(item)"
                    :title="'Double-click to rename'"
                  >
                    {{ item.name }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.isDirectory ? '-' : formatFileSize(item.size) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(item.modified) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex gap-2">
                  <button
                    v-if="!item.isDirectory"
                    @click="downloadFile(item.path)"
                    class="text-blue-600 hover:text-blue-900 cursor-pointer"
                    title="Download"
                  >
                    Download
                  </button>
                  <button
                    @click="startRename(item)"
                    class="text-purple-600 hover:text-purple-900 cursor-pointer"
                    title="Rename"
                  >
                    Rename
                  </button>
                  <button
                    @click="startMove(item)"
                    class="text-green-600 hover:text-green-900 cursor-pointer"
                    title="Move"
                  >
                    Move
                  </button>
                  <button
                    @click="deleteItem(item)"
                    class="text-red-600 hover:text-red-900 cursor-pointer"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Folder Modal -->
    <div
      v-if="showCreateFolderModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showCreateFolderModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Folder</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
            <input
              v-model="newFolderName"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter folder name"
              @keyup.enter="createFolder"
            />
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="showCreateFolderModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="createFolder"
              :disabled="!newFolderName.trim()"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rename Modal -->
    <div
      v-if="showRenameModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showRenameModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-[400px] shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Rename {{ renameItem?.isDirectory ? 'Folder' : 'File' }}</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              New Name
              <span v-if="!renameItem?.isDirectory" class="text-xs text-gray-500 ml-2">
                (Extension will be preserved: {{ renameItem?.name.includes('.') ? '.' + renameItem.name.split('.').pop() : 'none' }})
              </span>
            </label>
            <input
              v-model="newItemName"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              :placeholder="`Enter new ${renameItem?.isDirectory ? 'folder' : 'file'} name`"
              @keyup.enter="renameItemConfirm"
              ref="renameInputRef"
            />
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="showRenameModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="renameItemConfirm"
              :disabled="!newItemName.trim()"
              class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              Rename
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Move Modal -->
    <div
      v-if="showMoveModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showMoveModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Move {{ moveItem?.isDirectory ? 'Folder' : 'File' }}</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Destination Folder</label>
            <select
              v-model="moveDestinationPath"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Root (/)</option>
              <option v-for="folder in availableFolders" :key="folder.path" :value="folder.path">
                {{ folder.name }}
              </option>
            </select>
            <p class="mt-2 text-xs text-gray-500">
              Current: {{ moveItem?.path || '' }}
            </p>
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="showMoveModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="moveItemConfirm"
              :disabled="moveDestinationPath === getParentPath(moveItem?.path || '')"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              Move
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const currentPath = ref('');
const items = ref<any[]>([]);
const loading = ref(false);
const showCreateFolderModal = ref(false);
const newFolderName = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const folderInputRef = ref<HTMLInputElement | null>(null);
const dragging = ref(false);
const uploading = ref(false);
const showRenameModal = ref(false);
const showMoveModal = ref(false);
const renameItem = ref<any>(null);
const moveItem = ref<any>(null);
const newItemName = ref('');
const moveDestinationPath = ref('');
const renameInputRef = ref<HTMLInputElement | null>(null);
const availableFolders = ref<any[]>([]);

const pathParts = computed(() => {
  if (!currentPath.value) return [];
  return currentPath.value.split('/').filter(p => p);
});

function getPathUpTo(index: number): string {
  if (index < 0) return '';
  return pathParts.value.slice(0, index + 1).join('/');
}

async function loadFiles() {
  loading.value = true;
  try {
    const response = await axios.get('/api/storage', {
      params: { folderPath: currentPath.value }
    });
    items.value = response.data.items || [];
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

async function createFolder() {
  if (!newFolderName.value.trim()) {
    alert('Please enter a folder name');
    return;
  }

  try {
    await axios.post('/api/storage/folder', {
      folderName: newFolderName.value.trim(),
      parentPath: currentPath.value
    });
    showCreateFolderModal.value = false;
    newFolderName.value = '';
    await loadFiles();
  } catch (error: any) {
    alert('Error creating folder: ' + (error.response?.data?.error || error.message));
  }
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  await uploadFiles(Array.from(target.files), false);
  
  // Reset file input
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

async function handleFolderSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  await uploadFiles(Array.from(target.files), true);
  
  // Reset folder input
  if (folderInputRef.value) {
    folderInputRef.value.value = '';
  }
}

async function handleDrop(event: DragEvent) {
  dragging.value = false;
  
  if (!event.dataTransfer) return;
  
  // Check if it's a DataTransferItemList (better for folders)
  if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
    const items = Array.from(event.dataTransfer.items);
    const files: File[] = [];
    
    // Process items to get files
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          // If it's a directory, we need to use the folder picker instead
          if (entry.isDirectory) {
            alert('Please use the "Upload Folder" button to upload folders. Drag and drop folders is not fully supported by browsers.');
            return;
          } else {
            // It's a file
            const file = item.getAsFile();
            if (file) {
              files.push(file);
            }
          }
        }
      }
    }
    
    if (files.length > 0) {
      await uploadFiles(files, false);
    }
  } else if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    // Fallback to files API
    const files = Array.from(event.dataTransfer.files);
    
    // Check if it's a folder (has webkitRelativePath) or individual files
    const hasFolderStructure = files.some(file => {
      const fileWithPath = file as any;
      return fileWithPath.webkitRelativePath && fileWithPath.webkitRelativePath.includes('/');
    });
    
    await uploadFiles(files, hasFolderStructure);
  }
}

async function uploadFiles(files: File[], preserveStructure: boolean) {
  uploading.value = true;
  
  try {
    const formData = new FormData();
    
    // Collect file paths for folder structure preservation
    const filePaths: string[] = [];
    
    files.forEach(file => {
      formData.append('files', file);
      
      // Get webkitRelativePath if available (for folder uploads)
      const fileWithPath = file as any;
      if (preserveStructure && fileWithPath.webkitRelativePath) {
        filePaths.push(fileWithPath.webkitRelativePath);
      } else if (preserveStructure && fileWithPath.path) {
        // Fallback for some browsers
        filePaths.push(fileWithPath.path);
      } else {
        filePaths.push(file.name);
      }
    });
    
    formData.append('folderPath', currentPath.value);
    formData.append('preserveStructure', preserveStructure ? 'true' : 'false');
    
    // Send file paths for structure reconstruction
    if (preserveStructure) {
      formData.append('filePaths', JSON.stringify(filePaths));
      
      // Extract root folder name
      if (filePaths.length > 0 && filePaths[0].includes('/')) {
        const folderName = filePaths[0].split('/')[0];
        formData.append('folderName', folderName);
      }
    }

    await axios.post('/api/storage/upload', formData, {
      // Don't set Content-Type header - let axios set it automatically with boundary
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      }
    });
    
    await loadFiles();
  } catch (error: any) {
    alert('Error uploading files: ' + (error.response?.data?.error || error.message));
  } finally {
    uploading.value = false;
  }
}

function downloadFile(filePath: string) {
  window.open(`/api/storage/download?filePath=${encodeURIComponent(filePath)}`, '_blank');
}

async function deleteItem(item: any) {
  const itemType = item.isDirectory ? 'folder' : 'file';
  if (!confirm(`Are you sure you want to delete this ${itemType}? This action cannot be undone.`)) {
    return;
  }

  try {
    await axios.delete('/api/storage', {
      params: { filePath: item.path }
    });
    await loadFiles();
  } catch (error: any) {
    alert('Error deleting item: ' + (error.response?.data?.error || error.message));
  }
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

function startRename(item: any) {
  renameItem.value = item;
  // For files, remove extension from name for editing
  if (!item.isDirectory && item.name.includes('.')) {
    const nameParts = item.name.split('.');
    nameParts.pop(); // Remove extension
    newItemName.value = nameParts.join('.');
  } else {
    newItemName.value = item.name;
  }
  showRenameModal.value = true;
  // Focus input after modal is shown
  setTimeout(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  }, 100);
}

async function renameItemConfirm() {
  if (!renameItem.value || !newItemName.value.trim()) {
    alert('Please enter a name');
    return;
  }

  // Preserve file extension for files
  let finalName = newItemName.value.trim();
  if (!renameItem.value.isDirectory) {
    // Get original extension
    const originalExt = renameItem.value.name.includes('.') 
      ? '.' + renameItem.value.name.split('.').pop() 
      : '';
    
    // Remove extension from input if user added it
    if (finalName.endsWith(originalExt)) {
      finalName = finalName.slice(0, -originalExt.length);
    }
    
    // Add extension back
    finalName = finalName + originalExt;
  }

  // Sanitize name (but preserve extension)
  const sanitizedName = finalName.replace(/[<>:"/\\|?*]/g, '');
  if (sanitizedName !== finalName) {
    alert('Invalid name. Cannot contain: < > : " / \\ | ? *');
    return;
  }

  try {
    await axios.post('/api/storage/rename', {
      filePath: renameItem.value.path,
      newName: sanitizedName
    });
    showRenameModal.value = false;
    renameItem.value = null;
    newItemName.value = '';
    await loadFiles();
  } catch (error: any) {
    alert('Error renaming: ' + (error.response?.data?.error || error.message));
  }
}

async function startMove(item: any) {
  moveItem.value = item;
  moveDestinationPath.value = getParentPath(item.path);
  
  // Load all folders for selection
  await loadAllFolders();
  
  showMoveModal.value = true;
}

async function loadAllFolders() {
  try {
    // Recursively get all folders
    const response = await axios.get('/api/storage/folders');
    availableFolders.value = response.data.folders || [];
  } catch (error: any) {
    console.error('Error loading folders:', error);
    availableFolders.value = [];
  }
}

function getParentPath(filePath: string): string {
  if (!filePath) return '';
  const parts = filePath.split('/').filter(p => p);
  parts.pop(); // Remove filename
  return parts.join('/');
}

async function moveItemConfirm() {
  if (!moveItem.value) return;

  const currentParent = getParentPath(moveItem.value.path);
  if (moveDestinationPath.value === currentParent) {
    alert('Item is already in this location');
    return;
  }

  try {
    await axios.post('/api/storage/move', {
      filePath: moveItem.value.path,
      destinationPath: moveDestinationPath.value || ''
    });
    showMoveModal.value = false;
    moveItem.value = null;
    moveDestinationPath.value = '';
    await loadFiles();
  } catch (error: any) {
    alert('Error moving item: ' + (error.response?.data?.error || error.message));
  }
}

onMounted(() => {
  loadFiles();
});
</script>
