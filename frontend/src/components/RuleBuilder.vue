<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <p class="text-sm text-gray-600">Add rules to filter which contacts to import</p>
      <button
        @click="addRule"
        class="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer"
      >
        + Add Rule
      </button>
    </div>

    <div v-if="localRules.length === 0" class="text-sm text-gray-500 italic">
      No rules added. All contacts will be imported.
    </div>

    <div v-for="(rule, index) in localRules" :key="index" class="border border-gray-200 rounded-lg p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Column</label>
          <select
            v-model="rule.column_name"
            class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            @change="updateRules"
          >
            <option value="">-- Select Column --</option>
            <option v-for="header in headers" :key="header" :value="header">
              {{ header }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Operator</label>
          <select
            v-model="rule.operator"
            class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            @change="updateRules"
          >
            <option value="not_empty">Not Empty (has value)</option>
            <option value="exists">Exists</option>
            <option value="empty">Empty (no value)</option>
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="not_contains">Does Not Contain</option>
          </select>
        </div>

        <div v-if="rule.operator === 'equals' || rule.operator === 'contains' || rule.operator === 'not_contains'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <input
            type="text"
            v-model="rule.value"
            placeholder="Enter value"
            class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            @input="updateRules"
          />
        </div>

        <div class="flex items-end">
          <button
            @click="removeRule(index)"
            class="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 cursor-pointer"
          >
            Remove
          </button>
        </div>
      </div>

      <div class="mt-2 text-xs text-gray-500">
        Example: "{{ rule.column_name || 'Column' }} {{ getOperatorText(rule.operator) }} {{ rule.value || 'value' }}"
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Rule } from '@/types/rule';

const props = defineProps<{
  headers: string[];
  rules: Rule[];
}>();

const emit = defineEmits<{
  (e: 'update:rules', rules: Rule[]): void;
}>();

const localRules = ref<Partial<Rule>[]>([]);

watch(() => props.rules, (newRules) => {
  localRules.value = newRules.length > 0 ? [...newRules] : [];
}, { deep: true, immediate: true });

function addRule() {
  localRules.value.push({
    column_name: '',
    operator: 'not_empty',
    value: null,
    is_active: true
  });
  updateRules();
}

function removeRule(index: number) {
  localRules.value.splice(index, 1);
  updateRules();
}

function updateRules() {
  emit('update:rules', localRules.value as Rule[]);
}

function getOperatorText(operator: string): string {
  const operators: Record<string, string> = {
    'not_empty': 'has a value',
    'exists': 'exists',
    'empty': 'is empty',
    'equals': 'equals',
    'contains': 'contains',
    'not_contains': 'does not contain'
  };
  return operators[operator] || operator;
}
</script>

