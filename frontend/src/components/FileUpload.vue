<template>
  <div>
    <div
      @drop.prevent="handleDrop"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      :class="[
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        dragging ? 'border-green-500 bg-green-50' : 'border-gray-300',
        uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ]"
      @click="!uploading && $refs.fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls"
        @change="handleFileSelect"
        class="hidden"
        :disabled="uploading"
      />
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
          <span class="font-medium text-green-600">Click to upload</span> or drag and drop
        </p>
        <p class="text-xs text-gray-500 mt-1">Excel files only (.xlsx, .xls)</p>
      </div>
      <div v-else class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span class="ml-3 text-gray-600">Uploading...</span>
      </div>
    </div>

    <div v-if="error" class="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import type { UploadResponse } from '@/types/api';

const emit = defineEmits<{
  (e: 'file-uploaded', data: UploadResponse): void;
}>();

const dragging = ref(false);
const uploading = ref(false);
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    await uploadFile(target.files[0]);
  }
}

async function handleDrop(event: DragEvent) {
  dragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    await uploadFile(event.dataTransfer.files[0]);
  }
}

async function uploadFile(file: File) {
  uploading.value = true;
  error.value = null;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<UploadResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    emit('file-uploaded', response.data);
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to upload file';
  } finally {
    uploading.value = false;
  }
}
</script>

