<template>
  <div>
    <textarea
      ref="textareaRef"
      :value="template"
      @input="updateTemplate"
      :disabled="disabled"
      rows="10"
      class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      placeholder="Enter your message template here..."
    ></textarea>
    <div class="mt-2 text-sm text-gray-500">
      {{ characterCount }} characters
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  template: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:template', template: string): void;
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const characterCount = computed(() => props.template.length);

function updateTemplate(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:template', target.value);
}

function insertPlaceholder(placeholder: string) {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  
  // Ensure textarea has focus to get correct selection
  textarea.focus();
  
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || start;
  const currentValue = props.template || '';
  
  // Replace selected text or insert at cursor position
  const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
  
  emit('update:template', newValue);
  
  // Set cursor position after inserted placeholder
  // Use nextTick to ensure DOM is updated
  setTimeout(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      const newCursorPos = start + placeholder.length;
      textareaRef.value.setSelectionRange(newCursorPos, newCursorPos);
    }
  }, 10);
}

// Expose method to parent
defineExpose({
  insertPlaceholder
});
</script>

