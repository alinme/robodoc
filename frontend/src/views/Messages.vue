<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Send Messages</h2>
      <p class="mt-1 text-sm text-gray-500">Compose and send WhatsApp messages to contacts</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Message Editor -->
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Message Template</h3>
          <router-link
            to="/templates"
            class="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            Manage Templates
          </router-link>
        </div>
        
        <!-- Template Selection -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Load Template</label>
          <div class="flex gap-2">
            <select
              v-model="selectedTemplateId"
              class="flex-1 border border-gray-300 rounded-md px-3 py-2"
              @change="loadTemplate"
            >
              <option :value="null">-- Select Template --</option>
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                {{ tpl.name }}
              </option>
            </select>
            <button
              @click="saveAsTemplate"
              class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm cursor-pointer"
            >
              Save as Template
            </button>
          </div>
        </div>

        <MessageEditor
          ref="messageEditorRef"
          :template="template"
          @update:template="updateTemplate"
        />

        <div class="mt-4 p-4 bg-gray-50 rounded-md">
          <p class="text-sm font-medium text-gray-700 mb-2">Available placeholders (click to insert):</p>
          <ul class="text-xs text-gray-600 space-y-1">
            <li>
              <button
                @click="insertPlaceholder('{Name}')"
                class="hover:bg-green-100 transition-colors rounded px-1 py-0.5 cursor-pointer"
              >
                <code class="bg-white px-1 rounded cursor-pointer hover:bg-green-50">{Name}</code>
              </button>
              <span class="ml-1">- Full name</span>
            </li>
            <li>
              <button
                @click="insertPlaceholder('{GivenName}')"
                class="hover:bg-green-100 transition-colors rounded px-1 py-0.5 cursor-pointer"
              >
                <code class="bg-white px-1 rounded cursor-pointer hover:bg-green-50">{GivenName}</code>
              </button>
              <span class="ml-1">- First name</span>
            </li>
            <li>
              <button
                @click="insertPlaceholder('{Business}')"
                class="hover:bg-green-100 transition-colors rounded px-1 py-0.5 cursor-pointer"
              >
                <code class="bg-white px-1 rounded cursor-pointer hover:bg-green-50">{Business}</code>
              </button>
              <span class="ml-1">- Business/Institution</span>
            </li>
            <li>
              <button
                @click="insertPlaceholder('{Group}')"
                class="hover:bg-green-100 transition-colors rounded px-1 py-0.5 cursor-pointer"
              >
                <code class="bg-white px-1 rounded cursor-pointer hover:bg-green-50">{Group}</code>
              </button>
              <span class="ml-1">- Group name</span>
            </li>
            <li>
              <button
                @click="insertPlaceholder('{Email}')"
                class="hover:bg-green-100 transition-colors rounded px-1 py-0.5 cursor-pointer"
              >
                <code class="bg-white px-1 rounded cursor-pointer hover:bg-green-50">{Email}</code>
              </button>
              <span class="ml-1">- Email address</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Contact Selection -->
      <div class="bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Select Recipients</h3>
        
        <div class="space-y-4">
          <!-- Message Type Selector -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="messageType"
                  value="whatsapp"
                  class="mr-2"
                />
                <span>WhatsApp</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="messageType"
                  value="email"
                  class="mr-2"
                />
                <span>Email</span>
              </label>
            </div>
          </div>

          <!-- Email Subject (only for email) -->
          <div v-if="messageType === 'email'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
            <input
              v-model="emailSubject"
              type="text"
              :disabled="sendingEmails"
              class="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter email subject"
            />
            <div class="mt-2">
              <label class="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  v-model="preventThreading"
                  :disabled="sendingEmails"
                  class="mr-2 disabled:cursor-not-allowed"
                />
                <span>Add unique reference to prevent email threading</span>
              </label>
              <p class="text-xs text-gray-500 mt-1 ml-6">
                When enabled, each email will get a unique code (e.g., #fcj837) appended to the subject
              </p>
            </div>
          </div>

          <!-- Email Attachments (only for email) -->
          <div v-if="messageType === 'email'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Attachments (optional)</label>
            <div class="space-y-2">
              <input
                ref="fileInputRef"
                type="file"
                multiple
                @change="handleFileSelect"
                :disabled="sendingEmails"
                class="hidden"
                accept="*/*"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="fileInputRef?.click()"
                  :disabled="sendingEmails"
                  class="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:text-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200 cursor-pointer text-sm"
                >
                  + Upload New Files
                </button>
                <button
                  type="button"
                  @click="openStorageModal"
                  :disabled="sendingEmails"
                  class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer text-sm"
                >
                  📁 Choose from Storage
                </button>
              </div>
              
              <!-- Display selected files -->
              <div v-if="emailAttachments.length > 0" class="mt-2 space-y-1">
                <div
                  v-for="(file, index) in emailAttachments"
                  :key="index"
                  class="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm"
                >
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="text-gray-600">📎</span>
                    <span class="truncate">{{ file.originalFilename || file.filename }}</span>
                    <span class="text-gray-400 text-xs">({{ formatFileSize(file.fileSize) }})</span>
                  </div>
                  <button
                    type="button"
                    @click="removeAttachment(index)"
                    class="ml-2 text-red-600 hover:text-red-800 cursor-pointer"
                    title="Remove attachment"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Maximum 25MB per file. Up to 10 files per email.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Send to App Group</label>
            <select
              v-model="selectedGroupId"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              @change="handleGroupChange"
            >
              <option :value="null">-- Select Group --</option>
              <option v-for="group in groups" :key="group.id" :value="group.id">
                {{ group.name }} ({{ group.contactCount || 0 }} contacts)
              </option>
            </select>
          </div>

          <div class="text-center text-gray-500">OR</div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Individual Contacts</label>
            <button
              @click="showContactModal = true"
              class="block w-full text-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-green-500 hover:text-green-600 cursor-pointer"
            >
              Select Contacts
            </button>
            <div v-if="selectedContactIds.length > 0" class="mt-2 text-sm text-gray-600">
              {{ selectedContactIds.length }} contact(s) selected
            </div>
          </div>

          <div class="pt-4 border-t space-y-2">
            <button
              @click="sendMessages"
              :disabled="!canSend || sending || sendingEmails"
              class="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium cursor-pointer"
            >
              <span v-if="sendingEmails" class="flex items-center justify-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending... ({{ emailSendingProgress.sent }}/{{ emailSendingProgress.total }})
              </span>
              <span v-else-if="sending">
                Sending...
              </span>
              <span v-else>
                {{ messageType === 'email' ? 'Send Emails' : 'Send Messages' }}
              </span>
            </button>
            
            <!-- Email sending progress -->
            <div v-if="sendingEmails && emailSendingProgress.current" class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <div class="flex items-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span class="text-blue-800">Sending to: {{ emailSendingProgress.current }}</span>
              </div>
              <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  :style="{ width: emailSendingProgress.total > 0 ? (emailSendingProgress.sent / emailSendingProgress.total * 100) + '%' : '0%' }"
                ></div>
              </div>
            </div>
            
            <!-- Warning for email without email addresses -->
            <div 
              v-if="messageType === 'email' && selectedContactIds.length > 0 && !selectedContactsHaveEmail"
              class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800"
            >
              ⚠️ Some selected contacts don't have email addresses. Please select only contacts with email addresses.
            </div>
            <button
              v-if="selectedContactIds.length > 0"
              @click="showAddToWhatsAppGroupModal = true"
              :disabled="!whatsappStore.connected"
              class="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium cursor-pointer"
            >
              Add to WhatsApp Group
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Message History -->
    <div class="mt-6 bg-white shadow rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-gray-900">Message History</h3>
        <div class="flex gap-2">
          <button
            v-if="messageHistory.length > 0"
            @click="deleteAllMessages"
            :disabled="deletingMessages"
            class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {{ deletingMessages ? 'Deleting...' : 'Delete All' }}
          </button>
        </div>
      </div>
      <MessageHistory :messages="messageHistory" @retry="retryMessage" @delete="deleteMessage" />
    </div>

    <!-- Contact Selection Modal -->
    <div
      v-if="showContactModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showContactModal = false"
    >
      <div class="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white my-10 max-h-[90vh] overflow-y-auto">
        <div class="mt-3">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">Select Contacts</h3>
            <button
              @click="showContactModal = false"
              class="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
          
          <!-- Search and Filters -->
          <div class="mb-4 space-y-2">
            <input
              v-model="contactSearchQuery"
              type="text"
              placeholder="Search contacts..."
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              @input="searchContacts"
            />
            <div class="flex gap-2">
              <select
                v-model="contactGroupFilter"
                class="flex-1 border border-gray-300 rounded-md px-3 py-2"
                @change="searchContacts"
              >
                <option :value="null">All Groups</option>
                <option v-for="group in groups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Contacts List -->
          <div v-if="loadingContacts" class="text-center py-8 text-gray-500">
            Loading contacts...
          </div>
          <div v-else-if="availableContacts.length === 0" class="text-center py-8 text-gray-500">
            No contacts found
          </div>
          <div v-else class="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      :checked="allContactsSelected"
                      @change="toggleSelectAll"
                      class="rounded border-gray-300"
                    />
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Messages</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="contact in availableContacts"
                  :key="contact.id"
                  @click="toggleContact(contact.id, !selectedContactIds.includes(contact.id))"
                  class="hover:bg-gray-50 cursor-pointer transition-colors"
                  :class="{ 'bg-blue-50': selectedContactIds.includes(contact.id) }"
                >
                  <td class="px-4 py-2" @click.stop>
                    <input
                      type="checkbox"
                      :checked="selectedContactIds.includes(contact.id)"
                      @change="toggleContact(contact.id, ($event.target as HTMLInputElement).checked)"
                      @click.stop
                      class="rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-900">{{ contact.name }}</td>
                  <td class="px-4 py-2 text-sm text-gray-500">{{ formatPhoneForDisplay(contact.phone) }}</td>
                  <td class="px-4 py-2 text-sm text-gray-500">{{ contact.group_name || '-' }}</td>
                  <td class="px-4 py-2 text-sm text-gray-500">{{ contact.business || '-' }}</td>
                  <td class="px-4 py-2 text-sm text-gray-500">
                    <span v-if="contact.sent_count && contact.sent_count > 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Sent ({{ contact.sent_count }})
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-4 flex justify-between items-center">
            <div class="text-sm text-gray-600">
              {{ selectedContactIds.length }} contact(s) selected
            </div>
            <div class="flex gap-2">
              <button
                v-if="selectedContactIds.length > 0"
                @click="showAddToWhatsAppGroupModal = true"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
              >
                Add to WhatsApp Group
              </button>
              <button
                @click="clearContactSelection"
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                @click="showContactModal = false"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add to WhatsApp Group Modal -->
    <div
      v-if="showAddToWhatsAppGroupModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showAddToWhatsAppGroupModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Add to WhatsApp Group</h3>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Action *</label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="whatsAppGroupAction"
                  value="existing"
                  class="mr-2"
                />
                <span>Add to existing group</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="whatsAppGroupAction"
                  value="new"
                  class="mr-2"
                />
                <span>Create new group</span>
              </label>
            </div>
          </div>

          <!-- Existing Group Selection -->
          <div v-if="whatsAppGroupAction === 'existing'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Select WhatsApp Group *</label>
            <select
              v-model="selectedWhatsAppGroupId"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              :disabled="loadingWhatsAppGroups"
            >
              <option :value="null">-- Select Group --</option>
              <option v-for="group in whatsAppGroups" :key="group.id" :value="group.id">
                {{ group.name }} ({{ group.participantCount }} participants)
              </option>
            </select>
            <button
              v-if="!loadingWhatsAppGroups"
              @click="loadWhatsAppGroups"
              class="mt-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Refresh Groups
            </button>
            <p v-if="loadingWhatsAppGroups" class="mt-2 text-sm text-gray-500">Loading groups...</p>
          </div>

          <!-- New Group Creation -->
          <div v-if="whatsAppGroupAction === 'new'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
            <input
              v-model="newWhatsAppGroupName"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter group name"
            />
          </div>

          <p class="mb-4 text-sm text-gray-500">
            {{ selectedContactIds.length }} contact(s) will be {{ whatsAppGroupAction === 'new' ? 'added to the new' : 'added to the selected' }} group
          </p>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="showAddToWhatsAppGroupModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="addContactsToWhatsAppGroup"
              :disabled="!canAddToWhatsAppGroup || addingToWhatsAppGroup"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ addingToWhatsAppGroup ? 'Adding...' : (whatsAppGroupAction === 'new' ? 'Create Group' : 'Add to Group') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Storage Selection Modal -->
    <div
      v-if="showStorageModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showStorageModal = false"
    >
      <div class="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white my-10 max-h-[90vh] overflow-y-auto">
        <div class="mt-3">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">Select Files from Storage</h3>
            <button
              @click="showStorageModal = false"
              class="text-gray-400 hover:text-gray-600 cursor-pointer text-2xl"
            >
              ✕
            </button>
          </div>
          
          <!-- Storage Browser -->
          <StorageBrowser
            @file-selected="handleStorageFileSelected"
            :selected-files="selectedStorageFiles"
          />
          
          <div class="mt-4 flex justify-end gap-2">
            <button
              @click="showStorageModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="addStorageFilesToAttachments"
              :disabled="selectedStorageFiles.length === 0"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              Add Selected ({{ selectedStorageFiles.length }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Template Modal -->
    <div
      v-if="showSaveTemplateModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showSaveTemplateModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Save as Template</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
            <input
              v-model="newTemplateName"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., Welcome Message"
              @keyup.enter="handleSaveTemplate"
            />
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="showSaveTemplateModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="handleSaveTemplate"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import MessageEditor from '@/components/MessageEditor.vue';
import MessageHistory from '@/components/MessageHistory.vue';
import StorageBrowser from '@/components/StorageBrowser.vue';
import { useMessagesStore } from '@/stores/messages';
import { useGroupsStore } from '@/stores/groups';
import { useContactsStore } from '@/stores/contacts';
import { useWhatsAppStore } from '@/stores/whatsapp';
import { useTemplatesStore } from '@/stores/templates';
import { formatPhoneForDisplay } from '@/utils/phoneValidator';

const route = useRoute();
const messagesStore = useMessagesStore();
const groupsStore = useGroupsStore();
const contactsStore = useContactsStore();
const whatsappStore = useWhatsAppStore();
const templatesStore = useTemplatesStore();

const template = computed(() => messagesStore.template);
const groups = computed(() => groupsStore.groups);
const messageHistory = computed(() => messagesStore.messages);
const sending = computed(() => messagesStore.loading);
const templates = computed(() => templatesStore.templates);

const selectedGroupId = ref<number | null>(null);
const selectedContactIds = ref<number[]>([]);
const selectedTemplateId = ref<number | null>(null);
const showSaveTemplateModal = ref(false);
const showContactModal = ref(false);
const newTemplateName = ref('');
const messageEditorRef = ref<InstanceType<typeof MessageEditor> | null>(null);
const availableContacts = ref<any[]>([]);
const loadingContacts = ref(false);
const contactSearchQuery = ref('');
const contactGroupFilter = ref<number | null>(null);
const deletingMessages = ref(false);
const showAddToWhatsAppGroupModal = ref(false);
const whatsAppGroupAction = ref<'existing' | 'new'>('existing');
const selectedWhatsAppGroupId = ref<string | null>(null);
const newWhatsAppGroupName = ref('');
const whatsAppGroups = ref<any[]>([]);
const loadingWhatsAppGroups = ref(false);
const addingToWhatsAppGroup = ref(false);
const messageType = ref<'whatsapp' | 'email'>('whatsapp');
const emailSubject = ref('');
const preventThreading = ref(false);
const emailAttachments = ref<any[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadingAttachments = ref(false);
const showStorageModal = ref(false);
const selectedStorageFiles = ref<any[]>([]);
const sendingEmails = ref(false);
const emailSendingProgress = ref({ sent: 0, total: 0, current: '' });

// Filter contacts by email availability
const contactsWithEmail = computed(() => {
  return availableContacts.value.filter(c => c.email && c.email.trim() !== '');
});

const contactsWithoutEmail = computed(() => {
  return availableContacts.value.filter(c => !c.email || c.email.trim() === '');
});

const selectedContactsHaveEmail = computed(() => {
  if (selectedContactIds.value.length === 0) return true; // No selection yet
  const selectedContacts = availableContacts.value.filter(c => 
    selectedContactIds.value.includes(c.id)
  );
  return selectedContacts.every(c => c.email && c.email.trim() !== '');
});

const canSend = computed(() => {
  const hasTemplate = template.value && template.value.trim().length > 0;
  const hasRecipients = selectedGroupId.value !== null || selectedContactIds.value.length > 0;
  const hasEmailSubject = messageType.value === 'whatsapp' || (messageType.value === 'email' && emailSubject.value.trim().length > 0);
  
  // For email, check if selected contacts have email addresses
  if (messageType.value === 'email' && selectedContactIds.value.length > 0) {
    if (!selectedContactsHaveEmail.value) {
      return false;
    }
  }
  
  // For WhatsApp, allow sending even if not connected (will show error when trying to send)
  // This allows users to prepare messages while WhatsApp is connecting
  return hasTemplate && hasRecipients && hasEmailSubject;
});

const allContactsSelected = computed(() => {
  return availableContacts.value.length > 0 && 
         availableContacts.value.every(c => selectedContactIds.value.includes(c.id));
});

onMounted(async () => {
  await groupsStore.fetchGroups();
  await messagesStore.fetchHistory();
  await templatesStore.fetchTemplates();
  
  // Initialize WhatsApp status
  await whatsappStore.fetchStatus();

  // Check for contact IDs from query params
  if (route.query.contactIds) {
    const ids = (route.query.contactIds as string).split(',').map(id => parseInt(id));
    selectedContactIds.value = ids;
  }

  // Check for message type from query params
  if (route.query.messageType === 'email') {
    messageType.value = 'email';
  }

  // Load contacts if we have contact IDs from query params
  if (selectedContactIds.value.length > 0) {
    await loadContacts();
  }
});

async function loadContacts() {
  loadingContacts.value = true;
  try {
    const params: any = { limit: 1000, offset: 0 };
    if (contactGroupFilter.value) {
      params.groupId = contactGroupFilter.value;
    }
    if (contactSearchQuery.value) {
      params.search = contactSearchQuery.value;
    }
    
    const response = await axios.get('/api/contacts', { params });
    availableContacts.value = response.data.contacts;
  } catch (error: any) {
    console.error('Error loading contacts:', error);
    alert('Error loading contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    loadingContacts.value = false;
  }
}

async function searchContacts() {
  await loadContacts();
}

function toggleSelectAll(selected: boolean) {
  // Clear group selection when selecting individual contacts
  if (selected) {
    selectedGroupId.value = null;
  }
  
  if (selected) {
    availableContacts.value.forEach(contact => {
      if (!selectedContactIds.value.includes(contact.id)) {
        selectedContactIds.value.push(contact.id);
      }
    });
  } else {
    const contactIdsToRemove = availableContacts.value.map(c => c.id);
    selectedContactIds.value = selectedContactIds.value.filter(id => !contactIdsToRemove.includes(id));
  }
}

function clearContactSelection() {
  selectedContactIds.value = [];
}

function handleGroupChange() {
  // Clear individual contact selection when group is selected
  if (selectedGroupId.value !== null) {
    selectedContactIds.value = [];
  }
}

function toggleContact(contactId: number, selected: boolean) {
  // Clear group selection when individual contacts are selected
  if (selected) {
    selectedGroupId.value = null;
  }
  
  if (selected) {
    if (!selectedContactIds.value.includes(contactId)) {
      selectedContactIds.value.push(contactId);
    }
  } else {
    selectedContactIds.value = selectedContactIds.value.filter(id => id !== contactId);
  }
}

// Watch for modal opening to load contacts
watch(showContactModal, (isOpen) => {
  if (isOpen) {
    loadContacts();
  }
});

function updateTemplate(newTemplate: string) {
  messagesStore.setTemplate(newTemplate);
}

function insertPlaceholder(placeholder: string) {
  if (messageEditorRef.value) {
    messageEditorRef.value.insertPlaceholder(placeholder);
  }
}

async function sendMessages() {
  if (!canSend.value) return;

  if (messageType.value === 'whatsapp') {
    // Check WhatsApp connection before sending
    if (!whatsappStore.connected) {
      alert('WhatsApp is not connected. Please wait for the connection to be established. You can check the connection status in the Settings page.');
      return;
    }

    try {
      const result = await messagesStore.sendMessages(
        selectedContactIds.value,
        selectedGroupId.value,
        template.value,
        1000 // 1 second delay between messages
      );

      alert(`Sent ${result.sent} messages successfully. ${result.failed} failed.`);
      
      // Refresh history
      await messagesStore.fetchHistory();
      
      // Clear selection
      selectedContactIds.value = [];
      selectedGroupId.value = null;
    } catch (error: any) {
      alert('Error sending messages: ' + (error.response?.data?.error || error.message));
    }
  } else if (messageType.value === 'email') {
    // Send emails
    if (selectedContactIds.value.length === 0 && selectedGroupId.value === null) {
      alert('Please select at least one contact or group');
      return;
    }

    // Get contacts to send to
    let contactsToSend: any[] = [];
    
    if (selectedGroupId.value !== null) {
      // Get contacts from group
      const group = groups.value.find(g => g.id === selectedGroupId.value);
      if (group) {
        try {
          const response = await axios.get('/api/contacts', {
            params: { groupId: selectedGroupId.value, limit: 10000 }
          });
          contactsToSend = response.data.contacts || [];
        } catch (error: any) {
          alert('Error loading group contacts: ' + (error.response?.data?.error || error.message));
          return;
        }
      }
    } else {
      // Get selected contacts
      try {
        const response = await axios.get('/api/contacts', {
          params: { limit: 10000 }
        });
        contactsToSend = (response.data.contacts || []).filter((c: any) => 
          selectedContactIds.value.includes(c.id)
        );
      } catch (error: any) {
        alert('Error loading contacts: ' + (error.response?.data?.error || error.message));
        return;
      }
    }

    // Filter to only contacts with email
    contactsToSend = contactsToSend.filter(c => c.email && c.email.trim() !== '');

    if (contactsToSend.length === 0) {
      alert('No contacts with email addresses found. Please select contacts that have email addresses.');
      return;
    }

    // Confirm before sending
    if (!confirm(`Send email to ${contactsToSend.length} contact(s)?`)) {
      return;
    }

    sendingEmails.value = true;
    emailSendingProgress.value = {
      sent: 0,
      total: contactsToSend.length,
      current: ''
    };

    let sent = 0;
    let failed = 0;

    try {
      for (let i = 0; i < contactsToSend.length; i++) {
        const contact = contactsToSend[i];
        
        // Update progress
        emailSendingProgress.value.current = contact.email || contact.name || `Contact ${i + 1}`;
        emailSendingProgress.value.sent = sent + failed;
        
        try {
          // Replace placeholders in message
          let finalMessage = template.value;
          finalMessage = finalMessage.replace(/{Name}/g, contact.name || '');
          finalMessage = finalMessage.replace(/{GivenName}/g, (contact.name || '').split(' ')[0] || '');
          finalMessage = finalMessage.replace(/{Business}/g, contact.business || '');
          finalMessage = finalMessage.replace(/{Group}/g, contact.group_id ? (groups.value.find(g => g.id === contact.group_id)?.name || '') : '');
          finalMessage = finalMessage.replace(/{Email}/g, contact.email || '');

          // Generate unique subject with reference if preventThreading is enabled
          let finalSubject = emailSubject.value || 'Message from RoboDoc';
          if (preventThreading.value) {
            const uniqueRef = generateUniqueReference();
            finalSubject = `${finalSubject} #${uniqueRef}`;
          }

          await axios.post('/api/email/send', {
            email: contact.email,
            subject: finalSubject,
            message: finalMessage,
            contact_id: contact.id,
            template_id: selectedTemplateId.value,
            attachmentIds: emailAttachments.value.length > 0 ? emailAttachments.value : undefined
          });

          sent++;
          emailSendingProgress.value.sent = sent + failed;
          
          // Small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`Error sending email to ${contact.email}:`, error);
          failed++;
          emailSendingProgress.value.sent = sent + failed;
        }
      }

      alert(`Sent ${sent} email(s) successfully. ${failed} failed.`);
      
      // Refresh history
      await messagesStore.fetchHistory();
      
      // Clear only contact/group selection, keep subject and attachments
      selectedContactIds.value = [];
      selectedGroupId.value = null;
      // Don't clear emailSubject and emailAttachments - user wants to keep them
    } finally {
      sendingEmails.value = false;
      emailSendingProgress.value = { sent: 0, total: 0, current: '' };
    }
  }
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const files = Array.from(target.files);
  
  // Validate file count
  if (emailAttachments.value.length + files.length > 10) {
    alert('Maximum 10 attachments allowed. Please select fewer files.');
    return;
  }

  uploadingAttachments.value = true;
  
  try {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments', file);
    });

    const response = await axios.post('/api/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    // Add uploaded files to attachments list
    emailAttachments.value.push(...response.data.files);
    
    // Reset file input
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  } catch (error: any) {
    alert('Error uploading attachments: ' + (error.response?.data?.error || error.message));
  } finally {
    uploadingAttachments.value = false;
  }
}

function removeAttachment(index: number) {
  emailAttachments.value.splice(index, 1);
}

function generateUniqueReference(): string {
  // Generate a short alphanumeric code (6 characters: 3 letters + 3 numbers)
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  
  let ref = '';
  // Add 3 random letters
  for (let i = 0; i < 3; i++) {
    ref += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  // Add 3 random numbers
  for (let i = 0; i < 3; i++) {
    ref += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return ref;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function retryMessage(messageId: number) {
  try {
    await messagesStore.retryMessage(messageId);
    alert('Message retried successfully');
    await messagesStore.fetchHistory();
  } catch (error: any) {
    alert('Error retrying message: ' + (error.response?.data?.error || error.message));
  }
}

async function deleteMessage(messageId: number) {
  if (!confirm('Are you sure you want to delete this message?')) {
    return;
  }
  
  try {
    await axios.delete(`/api/messages/${messageId}`);
    await messagesStore.fetchHistory();
  } catch (error: any) {
    alert('Error deleting message: ' + (error.response?.data?.error || error.message));
  }
}

async function deleteAllMessages() {
  if (!confirm('Are you sure you want to delete ALL messages? This action cannot be undone. Type "DELETE ALL" to confirm.')) {
    return;
  }
  
  const userInput = prompt('Type "DELETE ALL" to confirm:');
  if (userInput !== 'DELETE ALL') {
    return;
  }
  
  deletingMessages.value = true;
  try {
    await axios.delete('/api/messages/all');
    await messagesStore.fetchHistory();
    alert('All messages deleted successfully');
  } catch (error: any) {
    alert('Error deleting messages: ' + (error.response?.data?.error || error.message));
  } finally {
    deletingMessages.value = false;
  }
}

async function loadTemplate() {
  if (!selectedTemplateId.value) return;
  
  try {
    const tpl = await templatesStore.getTemplate(selectedTemplateId.value);
    messagesStore.setTemplate(tpl.content);
    // Load email subject from template if it exists
    if (tpl.email_subject) {
      emailSubject.value = tpl.email_subject;
    }
  } catch (error: any) {
    alert('Error loading template: ' + (error.response?.data?.error || error.message));
  }
}

function saveAsTemplate() {
  if (!template.value.trim()) {
    alert('Please enter a message template first');
    return;
  }
  showSaveTemplateModal.value = true;
  newTemplateName.value = '';
}

async function handleSaveTemplate() {
  if (!newTemplateName.value.trim()) {
    alert('Please enter a template name');
    return;
  }

  try {
    // Save template with current email subject if in email mode
    const subjectToSave = messageType.value === 'email' ? emailSubject.value : undefined;
    await templatesStore.createTemplate(
      newTemplateName.value, 
      template.value,
      undefined, // html_template - not available from Messages page
      subjectToSave // email_subject
    );
    showSaveTemplateModal.value = false;
    newTemplateName.value = '';
    alert('Template saved successfully!');
  } catch (error: any) {
    alert('Error saving template: ' + (error.response?.data?.error || error.message));
  }
}

const canAddToWhatsAppGroup = computed(() => {
  if (selectedContactIds.value.length === 0) return false;
  if (whatsAppGroupAction.value === 'existing') {
    return selectedWhatsAppGroupId.value !== null;
  } else {
    return newWhatsAppGroupName.value.trim().length > 0;
  }
});

async function loadWhatsAppGroups() {
  loadingWhatsAppGroups.value = true;
  try {
    const response = await axios.get('/api/whatsapp/groups');
    whatsAppGroups.value = response.data.groups || [];
  } catch (error: any) {
    console.error('Error loading WhatsApp groups:', error);
    alert('Error loading WhatsApp groups: ' + (error.response?.data?.error || error.message));
  } finally {
    loadingWhatsAppGroups.value = false;
  }
}

async function addContactsToWhatsAppGroup() {
  if (!canAddToWhatsAppGroup.value) {
    alert('Please fill in all required fields');
    return;
  }

  // Check WhatsApp connection
  if (!whatsappStore.connected) {
    alert('WhatsApp is not connected. Please wait for the connection to be established.');
    return;
  }

  // Get selected contacts' phone numbers
  // Fetch contacts from database using selected IDs
  let selectedContacts: any[] = [];
  try {
    // Fetch all contacts and filter by selected IDs
    // This is a workaround since the API doesn't support fetching by multiple IDs directly
    const response = await axios.get('/api/contacts', {
      params: { limit: 10000, offset: 0 }
    });
    selectedContacts = (response.data.contacts || []).filter((c: any) => 
      selectedContactIds.value.includes(c.id)
    );
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    // Fallback: try from availableContacts if modal was open
    selectedContacts = availableContacts.value.filter(c => 
      selectedContactIds.value.includes(c.id)
    );
  }

  if (selectedContacts.length === 0) {
    alert('No contacts found. Please try selecting contacts again.');
    return;
  }

  if (selectedContacts.length < selectedContactIds.value.length) {
    console.warn(`Only found ${selectedContacts.length} of ${selectedContactIds.value.length} selected contacts`);
  }

  const participantPhones = selectedContacts.map((c: any) => c.phone).filter((phone: string) => phone);

  addingToWhatsAppGroup.value = true;
  try {
    if (whatsAppGroupAction.value === 'new') {
      // Create new WhatsApp group
      const response = await axios.post('/api/whatsapp/groups', {
        name: newWhatsAppGroupName.value.trim(),
        participantPhones
      });
      
      alert(`Successfully created WhatsApp group "${newWhatsAppGroupName.value}" and added ${participantPhones.length} contact(s)!`);
      
      // Reset form
      newWhatsAppGroupName.value = '';
      whatsAppGroupAction.value = 'existing';
    } else {
      // Add to existing group
      if (!selectedWhatsAppGroupId.value) {
        alert('Please select a group');
        return;
      }

      const response = await axios.post(`/api/whatsapp/groups/${selectedWhatsAppGroupId.value}/participants`, {
        participantPhones
      });
      
      const groupName = whatsAppGroups.value.find(g => g.id === selectedWhatsAppGroupId.value)?.name || 'group';
      alert(`Successfully added ${participantPhones.length} contact(s) to WhatsApp group "${groupName}"!`);
    }
    
    // Refresh WhatsApp groups list
    await loadWhatsAppGroups();
    
    // Close modal
    showAddToWhatsAppGroupModal.value = false;
    
    // Keep selection for sending messages if needed
  } catch (error: any) {
    alert('Error adding contacts to WhatsApp group: ' + (error.response?.data?.error || error.message));
  } finally {
    addingToWhatsAppGroup.value = false;
  }
}

// Watch for modal opening to load WhatsApp groups
watch(showAddToWhatsAppGroupModal, (isOpen) => {
  if (isOpen) {
    loadWhatsAppGroups();
  }
});

function openStorageModal() {
  showStorageModal.value = true;
}

function handleStorageFileSelected(files: any[]) {
  selectedStorageFiles.value = files;
}

async function addStorageFilesToAttachments() {
  if (selectedStorageFiles.value.length === 0) {
    return;
  }

  uploadingAttachments.value = true;
  const filesToProcess = selectedStorageFiles.value.filter(f => !f.isDirectory);
  const successfulFiles: string[] = [];
  const failedFiles: { name: string; error: string }[] = [];

  // Process files sequentially to avoid overwhelming the server
  for (const file of filesToProcess) {
    try {
      // Download file and convert to attachment format
      const response = await axios.get(`/api/storage/download?filePath=${encodeURIComponent(file.path)}`, {
        responseType: 'blob',
        timeout: 60000 // 60 second timeout for large files
      });
      
      // Get the filename from Content-Disposition header or use file.name
      let fileName = file.name;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1].replace(/['"]/g, '');
          // Decode URI if needed
          try {
            fileName = decodeURIComponent(fileName);
          } catch (e) {
            // Keep original if decode fails
          }
        }
      }
      
      // Create a temporary file object
      const blob = response.data;
      const tempFile = new File([blob], fileName, { 
        type: response.headers['content-type'] || blob.type || 'application/octet-stream' 
      });
      
      // Upload as temporary attachment
      const formData = new FormData();
      formData.append('attachments', tempFile);
      
      const uploadResponse = await axios.post('/api/attachments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60 second timeout for large files
      });
      
      // Add to attachments list
      emailAttachments.value.push(...uploadResponse.data.files);
      successfulFiles.push(fileName);
    } catch (error: any) {
      console.error('Error adding storage file:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      failedFiles.push({ name: file.name, error: errorMessage });
    }
  }
  
  uploadingAttachments.value = false;
  
  // Show results
  if (successfulFiles.length > 0 && failedFiles.length === 0) {
    // All succeeded
    alert(`Successfully added ${successfulFiles.length} file(s) to attachments.`);
  } else if (successfulFiles.length > 0 && failedFiles.length > 0) {
    // Some succeeded, some failed
    alert(`Added ${successfulFiles.length} file(s) successfully. Failed to add ${failedFiles.length} file(s):\n${failedFiles.map(f => `- ${f.name}: ${f.error}`).join('\n')}`);
  } else if (failedFiles.length > 0) {
    // All failed
    alert(`Failed to add ${failedFiles.length} file(s):\n${failedFiles.map(f => `- ${f.name}: ${f.error}`).join('\n')}`);
  }
  
  // Clear selection and close modal
  selectedStorageFiles.value = [];
  showStorageModal.value = false;
}
</script>

