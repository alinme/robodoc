<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold text-gray-900">Message Templates</h2>
        <p class="mt-1 text-sm text-gray-500">Create and manage message templates</p>
      </div>
      <button
        @click="showAddModal = true"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
      >
        + New Template
      </button>
    </div>

    <!-- Templates List -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div v-if="loading" class="p-6 text-center text-gray-500">
        Loading templates...
      </div>
      <div v-else-if="templates.length === 0" class="p-6 text-center text-gray-500">
        No templates yet. Create your first template!
      </div>
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="template in templates"
          :key="template.id"
          class="p-6 hover:bg-gray-50"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-gray-900">{{ template.name }}</h3>
              <div class="mt-2 p-3 bg-gray-50 rounded-md">
                <pre class="text-sm text-gray-700 whitespace-pre-wrap">{{ template.content }}</pre>
              </div>
              <p class="mt-2 text-xs text-gray-500">
                Created: {{ new Date(template.created_at).toLocaleString() }}
                <span v-if="template.updated_at !== template.created_at">
                  | Updated: {{ new Date(template.updated_at).toLocaleString() }}
                </span>
              </p>
            </div>
            <div class="ml-4 flex gap-2">
              <button
                @click="editTemplate(template)"
                class="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer"
              >
                Edit
              </button>
              <button
                @click="deleteTemplate(template.id)"
                class="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Template Modal -->
    <div
      v-if="showAddModal || editingTemplate"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="closeModal"
    >
      <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white my-10">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ editingTemplate ? 'Edit Template' : 'New Template' }}
          </h3>
          <form @submit.prevent="handleSaveTemplate">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
                <input
                  v-model="templateForm.name"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Welcome Message"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email Subject (Optional)</label>
                <input
                  v-model="templateForm.email_subject"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Welcome to Our Service"
                />
                <p class="mt-1 text-xs text-gray-500">This subject will be automatically loaded when you select this template</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Template Content *</label>
                <textarea
                  ref="textareaRef"
                  v-model="templateForm.content"
                  required
                  rows="10"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter your message template. Use {Name}, {GivenName}, {Business}, {Group}, {Email} as placeholders."
                ></textarea>
                <div class="mt-2">
                  <p class="text-xs font-medium text-gray-700 mb-1">Available placeholders (click to insert):</p>
                  <div class="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      @click="insertPlaceholder('{Name}')"
                      class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer"
                    >
                      <code>{Name}</code>
                    </button>
                    <button
                      type="button"
                      @click="insertPlaceholder('{GivenName}')"
                      class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer"
                    >
                      <code>{GivenName}</code>
                    </button>
                    <button
                      type="button"
                      @click="insertPlaceholder('{Business}')"
                      class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer"
                    >
                      <code>{Business}</code>
                    </button>
                    <button
                      type="button"
                      @click="insertPlaceholder('{Group}')"
                      class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer"
                    >
                      <code>{Group}</code>
                    </button>
                    <button
                      type="button"
                      @click="insertPlaceholder('{Email}')"
                      class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer"
                    >
                      <code>{Email}</code>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  HTML Template (Optional)
                  <span class="text-xs text-gray-500 ml-2">Use {BODY} placeholder to insert the text template above</span>
                </label>
                <textarea
                  v-model="templateForm.html_template"
                  rows="15"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                  placeholder='<html><head><style>...</style></head><body><header>...</header>{BODY}<footer>...</footer></body></html>'
                ></textarea>
                <div class="mt-2">
                  <p class="text-xs text-gray-500">
                    The HTML template will wrap your text template. Use <code class="bg-gray-100 px-1 rounded">{BODY}</code> to insert the text content.
                    If no HTML template is provided, the text will be converted to HTML automatically.
                  </p>
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-6">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {{ saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTemplatesStore } from '@/stores/templates';
import type { MessageTemplate } from '@/types/template';

const templatesStore = useTemplatesStore();

const templates = computed(() => templatesStore.templates);
const loading = computed(() => templatesStore.loading);
const showAddModal = ref(false);
const editingTemplate = ref<MessageTemplate | null>(null);
const saving = ref(false);
const templateForm = ref({
  name: '',
  content: '',
  html_template: '',
  email_subject: ''
});
const textareaRef = ref<HTMLTextAreaElement | null>(null);

onMounted(async () => {
  await templatesStore.fetchTemplates();
});

function editTemplate(template: MessageTemplate) {
  editingTemplate.value = template;
  templateForm.value = {
    name: template.name,
    content: template.content,
    html_template: template.html_template || '',
    email_subject: template.email_subject || ''
  };
}

function closeModal() {
  showAddModal.value = false;
  editingTemplate.value = null;
  templateForm.value = {
    name: '',
    content: '',
    html_template: '',
    email_subject: ''
  };
}

async function handleSaveTemplate() {
  if (!templateForm.value.name.trim() || !templateForm.value.content.trim()) {
    alert('Template name and content are required');
    return;
  }

  saving.value = true;
  try {
    if (editingTemplate.value) {
      await templatesStore.updateTemplate(
        editingTemplate.value.id,
        templateForm.value.name,
        templateForm.value.content,
        templateForm.value.html_template,
        templateForm.value.email_subject
      );
    } else {
      await templatesStore.createTemplate(
        templateForm.value.name,
        templateForm.value.content,
        templateForm.value.html_template,
        templateForm.value.email_subject
      );
    }
    closeModal();
  } catch (error: any) {
    alert('Error saving template: ' + (error.response?.data?.error || error.message));
  } finally {
    saving.value = false;
  }
}

async function deleteTemplate(id: number) {
  if (!confirm('Are you sure you want to delete this template?')) return;

  try {
    await templatesStore.deleteTemplate(id);
  } catch (error: any) {
    alert('Error deleting template: ' + (error.response?.data?.error || error.message));
  }
}

function insertPlaceholder(placeholder: string) {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  textarea.focus();
  
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || start;
  const currentValue = templateForm.value.content || '';
  
  // Replace selected text or insert at cursor position
  const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
  templateForm.value.content = newValue;
  
  // Set cursor position after inserted placeholder
  setTimeout(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      const newCursorPos = start + placeholder.length;
      textareaRef.value.setSelectionRange(newCursorPos, newCursorPos);
    }
  }, 10);
}
</script>

