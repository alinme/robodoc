<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Mapping Name (for saving)</label>
      <input
        type="text"
        v-model="localMapping.name"
        placeholder="e.g., Centralizator Template"
        class="w-full border border-gray-300 rounded-md px-3 py-2"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          School Name Column <span class="text-red-500">*</span>
        </label>
        <select
          v-model="localMapping.school_name_column"
          class="w-full border border-gray-300 rounded-md px-3 py-2"
          @change="updateMapping"
        >
          <option :value="null">-- Select Column --</option>
          <option v-for="header in headers" :key="header" :value="header">
            {{ header }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Address Column <span class="text-red-500">*</span>
        </label>
        <select
          v-model="localMapping.address_column"
          class="w-full border border-gray-300 rounded-md px-3 py-2"
          @change="updateMapping"
        >
          <option :value="null">-- Select Column --</option>
          <option v-for="header in headers" :key="header" :value="header">
            {{ header }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Protocol # Column (optional)</label>
        <select
          v-model="localMapping.protocol_number_column"
          class="w-full border border-gray-300 rounded-md px-3 py-2"
          @change="updateMapping"
        >
          <option :value="null">-- Select Column --</option>
          <option v-for="header in headers" :key="header" :value="header">
            {{ header }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex justify-end">
      <button
        @click="saveMapping"
        :disabled="!canSave"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
      >
        Save Mapping
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import axios from 'axios';
import type { CentralizatorMapping } from '@/types/api';

const props = defineProps<{
  headers: string[];
  mapping: CentralizatorMapping;
}>();

const emit = defineEmits<{
  (e: 'update:mapping', mapping: CentralizatorMapping): void;
  (e: 'mapping-saved'): void;
}>();

const localMapping = ref<CentralizatorMapping>({ ...props.mapping });

const canSave = computed(() => {
  return (
    localMapping.value.name &&
    localMapping.value.school_name_column &&
    localMapping.value.address_column
  );
});

watch(() => props.mapping, (newMapping) => {
  localMapping.value = { ...newMapping };
}, { deep: true });

function updateMapping() {
  emit('update:mapping', { ...localMapping.value });
}

async function saveMapping() {
  if (!canSave.value) return;

  try {
    await axios.post('/api/centralizator/mappings', localMapping.value);
    alert('Mapping saved successfully!');
    emit('mapping-saved');
  } catch (error: any) {
    alert('Error saving mapping: ' + (error.response?.data?.error || error.message));
  }
}
</script>
