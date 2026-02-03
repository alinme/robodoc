<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold text-gray-900">Groups</h2>
        <p class="mt-1 text-sm text-gray-500">Manage your contact groups</p>
      </div>
      <button
        @click="showAddModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
      >
        + New Group
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading groups...</p>
    </div>

    <!-- Groups Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="group in groups"
        :key="group.id"
        class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
        @click="viewGroup(group)"
      >
        <div class="p-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-semibold text-gray-900">{{ group.name }}</h3>
              <p v-if="group.description" class="text-sm text-gray-500 mt-1">{{ group.description }}</p>
            </div>
            <div class="flex gap-2 ml-4">
              <button
                @click.stop="editGroup(group)"
                class="p-2 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                title="Edit Group"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click.stop="deleteGroup(group)"
                class="p-2 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                title="Delete Group"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between pt-4 border-t border-gray-200">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="text-2xl font-bold text-blue-600">{{ group.contactCount || 0 }}</span>
              <span class="text-sm text-gray-500 ml-1">contacts</span>
            </div>
            <button
              @click.stop="viewGroup(group)"
              class="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
            >
              View Details →
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="groups.length === 0" class="col-span-full text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No groups</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
        <div class="mt-6">
          <button
            @click="showAddModal = true"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            + New Group
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Group Modal -->
    <div
      v-if="showAddModal || showEditModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="closeModal"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ showEditModal ? 'Edit Group' : 'New Group' }}
          </h3>
          <form @submit.prevent="saveGroup">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  v-model="groupForm.name"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Group name"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  v-model="groupForm.description"
                  rows="3"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Group description (optional)"
                ></textarea>
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
                {{ saving ? 'Saving...' : (showEditModal ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Group Details Modal -->
    <div
      v-if="showDetailsModal && selectedGroup"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="closeDetailsModal"
    >
      <div class="relative top-10 mx-auto p-5 border w-full max-w-[80%] shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-2xl font-bold text-gray-900">{{ selectedGroup.name }}</h3>
              <p v-if="selectedGroup.description" class="text-sm text-gray-500 mt-1">
                {{ selectedGroup.description }}
              </p>
            </div>
            <button
              @click="closeDetailsModal"
              class="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 mb-6">
            <button
              @click="showAddContactsModal = true"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              + Add Contacts
            </button>
            <button
              @click="showSyncToWhatsAppModal = true"
              :disabled="!whatsappStore.connected || groupContacts.length === 0"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              title="Sync all contacts from this group to a WhatsApp group"
            >
              📱 Sync to WhatsApp
            </button>
            <button
              @click="validateGroupContacts"
              :disabled="!whatsappStore.connected || groupContacts.length === 0 || validatingContacts"
              class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              title="Validate WhatsApp accounts for all contacts in this group"
            >
              {{ validatingContacts ? 'Validating...' : '✓ Validate WhatsApp' }}
            </button>
            <button
              @click="exportGroupContacts"
              :disabled="exportingGroup || groupContacts.length === 0"
              class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              title="Export contacts from this group to Gmail CSV format"
            >
              {{ exportingGroup ? 'Exporting...' : '📧 Export to Gmail' }}
            </button>
            <button
              @click="editGroup(selectedGroup)"
              class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
            >
              Edit Group
            </button>
          </div>

          <!-- Contacts List -->
          <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-4">
              Contacts ({{ groupContacts.length }})
            </h4>
            <div v-if="loadingContacts" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
            <div v-else-if="groupContacts.length === 0" class="text-center py-8 text-gray-500">
              No contacts in this group
            </div>
            <div v-else class="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Messages
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WAStatus
                    </th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="contact in groupContacts" :key="contact.id">
                    <td class="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
                      <div class="flex items-center gap-1">
                        <span :class="{ 'truncate': !expandedNames[contact.id] }" :title="expandedNames[contact.id] ? '' : contact.name">
                          {{ contact.name }}
                        </span>
                        <button
                          v-if="contact.name && contact.name.length > 20"
                          @click.stop="toggleExpandName(contact.id)"
                          class="text-blue-600 hover:text-blue-800 text-xs cursor-pointer flex-shrink-0"
                        >
                          {{ expandedNames[contact.id] ? 'Hide' : 'Show' }}
                        </button>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ formatPhone(contact.phone) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ contact.email || '-' }}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div v-if="contact.business" class="flex items-center gap-1">
                        <span :class="{ 'truncate': !expandedBusiness[contact.id] }" :title="expandedBusiness[contact.id] ? '' : contact.business">
                          {{ contact.business }}
                        </span>
                        <button
                          v-if="contact.business.length > 20"
                          @click.stop="toggleExpandBusiness(contact.id)"
                          class="text-blue-600 hover:text-blue-800 text-xs cursor-pointer flex-shrink-0"
                        >
                          {{ expandedBusiness[contact.id] ? 'Hide' : 'Show' }}
                        </button>
                      </div>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span v-if="contact.sent_count && contact.sent_count > 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Sent ({{ contact.sent_count }})
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <div v-if="contact.whatsapp_valid === null || contact.whatsapp_valid === undefined" class="text-gray-400">
                        Not checked
                      </div>
                      <div v-else class="flex items-center gap-2">
                        <span v-if="contact.whatsapp_valid === 1" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Valid
                        </span>
                        <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ✗ Invalid
                        </span>
                        <span v-if="contact.whatsapp_in_contacts === 1" class="text-xs text-blue-600" title="In your WhatsApp contacts">
                          📱
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        @click="removeContactFromGroup(contact.id)"
                        class="text-red-600 hover:text-red-900 cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sync to WhatsApp Modal -->
    <div
      v-if="showSyncToWhatsAppModal && selectedGroup"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showSyncToWhatsAppModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Sync to WhatsApp Group</h3>
          <p class="text-sm text-gray-500 mb-4">
            Sync all {{ groupContacts.length }} contact(s) from "{{ selectedGroup.name }}" to a WhatsApp group
          </p>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Action *</label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="whatsAppSyncAction"
                  value="new"
                  class="mr-2"
                />
                <span>Create new WhatsApp group</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="whatsAppSyncAction"
                  value="existing"
                  class="mr-2"
                />
                <span>Add to existing WhatsApp group</span>
              </label>
            </div>
          </div>

          <!-- New Group Creation -->
          <div v-if="whatsAppSyncAction === 'new'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">WhatsApp Group Name *</label>
            <input
              v-model="newWhatsAppGroupName"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              :placeholder="selectedGroup.name"
            />
            <p class="mt-1 text-xs text-gray-500">Leave empty to use "{{ selectedGroup.name }}"</p>
          </div>

          <!-- Existing Group Selection -->
          <div v-if="whatsAppSyncAction === 'existing'" class="mb-4">
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

          <div class="flex justify-end gap-2 mt-6">
            <button
              type="button"
              @click="showSyncToWhatsAppModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="syncToWhatsApp"
              :disabled="!canSyncToWhatsApp || syncingToWhatsApp"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ syncingToWhatsApp ? 'Syncing...' : (whatsAppSyncAction === 'new' ? 'Create & Sync' : 'Sync') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Contacts Modal -->
    <div
      v-if="showAddContactsModal && selectedGroup"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="showAddContactsModal = false"
    >
      <div class="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Add Contacts to {{ selectedGroup.name }}
          </h3>
          
          <!-- Search -->
          <div class="mb-4">
            <input
              v-model="contactSearch"
              type="text"
              placeholder="Search contacts..."
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              @input="searchAvailableContacts"
            />
          </div>

          <!-- Available Contacts -->
          <div class="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <div v-if="loadingAvailableContacts" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
            <div v-else-if="availableContacts.length === 0" class="text-center py-8 text-gray-500">
              No available contacts
            </div>
            <table v-else class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          :checked="selectedContactIds.length === availableContacts.length && availableContacts.length > 0"
                          @change="toggleSelectAll"
                          class="rounded border-gray-300 cursor-pointer"
                        />
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WAStatus</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="contact in availableContacts"
                      :key="contact.id"
                      class="hover:bg-gray-50 cursor-pointer"
                      @click="toggleContactSelection(contact.id)"
                    >
                      <td class="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          :checked="selectedContactIds.includes(contact.id)"
                          @change="toggleContactSelection(contact.id)"
                          @click.stop
                          class="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td class="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
                        <div class="flex items-center gap-1">
                          <span :class="{ 'truncate': !expandedNames[contact.id] }" :title="expandedNames[contact.id] ? '' : contact.name">
                            {{ contact.name }}
                          </span>
                          <button
                            v-if="contact.name && contact.name.length > 20"
                            @click.stop="toggleExpandName(contact.id)"
                            class="text-blue-600 hover:text-blue-800 text-xs cursor-pointer flex-shrink-0"
                          >
                            {{ expandedNames[contact.id] ? 'Hide' : 'Show' }}
                          </button>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ formatPhone(contact.phone) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ contact.email || '-' }}
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div v-if="contact.business" class="flex items-center gap-1">
                          <span :class="{ 'truncate': !expandedBusiness[contact.id] }" :title="expandedBusiness[contact.id] ? '' : contact.business">
                            {{ contact.business }}
                          </span>
                          <button
                            v-if="contact.business.length > 20"
                            @click.stop="toggleExpandBusiness(contact.id)"
                            class="text-blue-600 hover:text-blue-800 text-xs cursor-pointer flex-shrink-0"
                          >
                            {{ expandedBusiness[contact.id] ? 'Hide' : 'Show' }}
                          </button>
                        </div>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span v-if="contact.sent_count && contact.sent_count > 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Sent ({{ contact.sent_count }})
                        </span>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <div v-if="contact.whatsapp_valid === null || contact.whatsapp_valid === undefined" class="text-gray-400">
                          Not checked
                        </div>
                        <div v-else class="flex items-center gap-2">
                          <span v-if="contact.whatsapp_valid === 1" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Valid
                          </span>
                          <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ Invalid
                          </span>
                          <span v-if="contact.whatsapp_in_contacts === 1" class="text-xs text-blue-600" title="In your WhatsApp contacts">
                            📱
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
            </table>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              @click="showAddContactsModal = false; selectedContactIds = []"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="addContactsToGroup"
              :disabled="selectedContactIds.length === 0 || addingContacts"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ addingContacts ? 'Adding...' : `Add ${selectedContactIds.length} Contact(s)` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import { useGroupsStore } from '@/stores/groups';
import { useWhatsAppStore } from '@/stores/whatsapp';
import { formatPhoneForDisplay } from '@/utils/phoneValidator';
import type { Group } from '@/types/contact';

const groupsStore = useGroupsStore();
const whatsappStore = useWhatsAppStore();

const loading = ref(false);
const groups = ref<Group[]>([]);
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDetailsModal = ref(false);
const showAddContactsModal = ref(false);
const selectedGroup = ref<Group | null>(null);
const saving = ref(false);
const groupForm = ref({
  name: '',
  description: ''
});
const groupContacts = ref<any[]>([]);
const loadingContacts = ref(false);
const availableContacts = ref<any[]>([]);
const loadingAvailableContacts = ref(false);
const contactSearch = ref('');
const selectedContactIds = ref<number[]>([]);
const addingContacts = ref(false);
const showSyncToWhatsAppModal = ref(false);
const whatsAppSyncAction = ref<'new' | 'existing'>('new');
const newWhatsAppGroupName = ref('');
const selectedWhatsAppGroupId = ref<string | null>(null);
const whatsAppGroups = ref<any[]>([]);
const loadingWhatsAppGroups = ref(false);
const syncingToWhatsApp = ref(false);
const exportingGroup = ref(false);
const validatingContacts = ref(false);
const validationResults = ref<any>(null);
const expandedNames = ref<Record<number, boolean>>({});
const expandedBusiness = ref<Record<number, boolean>>({});

onMounted(async () => {
  await fetchGroups();
  await whatsappStore.fetchStatus();
});

async function fetchGroups() {
  loading.value = true;
  try {
    await groupsStore.fetchGroups();
    groups.value = groupsStore.groups;
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    alert('Error loading groups: ' + (error.response?.data?.error || error.message));
  } finally {
    loading.value = false;
  }
}

function viewGroup(group: Group) {
  selectedGroup.value = group;
  showDetailsModal.value = true;
  fetchGroupContacts(group.id);
}

function closeDetailsModal() {
  showDetailsModal.value = false;
  selectedGroup.value = null;
  groupContacts.value = [];
}

function editGroup(group: Group) {
  selectedGroup.value = group;
  groupForm.value = {
    name: group.name,
    description: group.description || ''
  };
  showEditModal.value = true;
  showDetailsModal.value = false;
}

function closeModal() {
  showAddModal.value = false;
  showEditModal.value = false;
  groupForm.value = { name: '', description: '' };
  selectedGroup.value = null;
}

async function saveGroup() {
  if (!groupForm.value.name.trim()) {
    alert('Group name is required');
    return;
  }

  saving.value = true;
  try {
    if (showEditModal.value && selectedGroup.value) {
      await groupsStore.updateGroup(selectedGroup.value.id, {
        name: groupForm.value.name.trim(),
        description: groupForm.value.description.trim() || null
      });
    } else {
      await groupsStore.createGroup(
        groupForm.value.name.trim(),
        groupForm.value.description.trim() || undefined
      );
    }
    await fetchGroups();
    closeModal();
  } catch (error: any) {
    alert('Error saving group: ' + (error.response?.data?.error || error.message));
  } finally {
    saving.value = false;
  }
}

async function deleteGroup(group: Group) {
  if (!confirm(`Are you sure you want to delete "${group.name}"?`)) {
    return;
  }

  try {
    await groupsStore.deleteGroup(group.id);
    await fetchGroups();
    if (selectedGroup.value?.id === group.id) {
      closeDetailsModal();
    }
  } catch (error: any) {
    alert('Error deleting group: ' + (error.response?.data?.error || error.message));
  }
}

async function fetchGroupContacts(groupId: number) {
  loadingContacts.value = true;
  try {
    const response = await axios.get(`/api/groups/${groupId}/contacts`);
    groupContacts.value = response.data.contacts;
  } catch (error: any) {
    console.error('Error fetching group contacts:', error);
    alert('Error loading contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    loadingContacts.value = false;
  }
}

async function searchAvailableContacts() {
  if (!selectedGroup.value) return;
  
  loadingAvailableContacts.value = true;
  try {
    const response = await axios.get(`/api/groups/${selectedGroup.value.id}/contacts/available`, {
      params: { search: contactSearch.value }
    });
    availableContacts.value = response.data.contacts;
  } catch (error: any) {
    console.error('Error searching contacts:', error);
  } finally {
    loadingAvailableContacts.value = false;
  }
}

function toggleContactSelection(contactId: number) {
  const index = selectedContactIds.value.indexOf(contactId);
  if (index > -1) {
    selectedContactIds.value.splice(index, 1);
  } else {
    selectedContactIds.value.push(contactId);
  }
}

function toggleSelectAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
    selectedContactIds.value = availableContacts.value.map(c => c.id);
  } else {
    selectedContactIds.value = [];
  }
}

async function addContactsToGroup() {
  if (!selectedGroup.value || selectedContactIds.value.length === 0) return;

  addingContacts.value = true;
  try {
    await axios.post(`/api/groups/${selectedGroup.value.id}/contacts`, {
      contactIds: selectedContactIds.value
    });
    await fetchGroupContacts(selectedGroup.value.id);
    await fetchGroups();
    showAddContactsModal.value = false;
    selectedContactIds.value = [];
    contactSearch.value = '';
    availableContacts.value = [];
  } catch (error: any) {
    alert('Error adding contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    addingContacts.value = false;
  }
}

async function removeContactFromGroup(contactId: number) {
  if (!selectedGroup.value) return;
  
  if (!confirm('Remove this contact from the group?')) {
    return;
  }

  try {
    await axios.delete(`/api/groups/${selectedGroup.value.id}/contacts`, {
      data: { contactIds: [contactId] }
    });
    await fetchGroupContacts(selectedGroup.value.id);
    await fetchGroups();
  } catch (error: any) {
    alert('Error removing contact: ' + (error.response?.data?.error || error.message));
  }
}

function formatPhone(phone: string) {
  return formatPhoneForDisplay(phone);
}

function toggleExpandName(contactId: number) {
  expandedNames.value[contactId] = !expandedNames.value[contactId];
}

function toggleExpandBusiness(contactId: number) {
  expandedBusiness.value[contactId] = !expandedBusiness.value[contactId];
}

// Load available contacts when modal opens
async function loadAvailableContacts() {
  if (showAddContactsModal.value && selectedGroup.value) {
    await searchAvailableContacts();
  }
}

// Watch for modal opening
watch(showAddContactsModal, (newVal) => {
  if (newVal) {
    loadAvailableContacts();
  }
});

// Watch for sync modal opening
watch(showSyncToWhatsAppModal, (newVal) => {
  if (newVal) {
    loadWhatsAppGroups();
    // Reset form
    whatsAppSyncAction.value = 'new';
    newWhatsAppGroupName.value = '';
    selectedWhatsAppGroupId.value = null;
  }
});

const canSyncToWhatsApp = computed(() => {
  if (groupContacts.value.length === 0) return false;
  if (whatsAppSyncAction.value === 'new') {
    return true; // Group name is optional, will use app group name if empty
  } else {
    return selectedWhatsAppGroupId.value !== null;
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

async function exportGroupContacts() {
  if (!selectedGroup.value) return;
  
  if (groupContacts.value.length === 0) {
    alert('No contacts in this group to export');
    return;
  }

  exportingGroup.value = true;
  try {
    const response = await axios.get('/api/contacts/export', {
      params: { groupId: selectedGroup.value.id },
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const groupName = selectedGroup.value.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    link.setAttribute('download', `contacts-group-${groupName}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Error exporting group contacts:', error);
    alert('Error exporting contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    exportingGroup.value = false;
  }
}

async function validateGroupContacts() {
  if (!selectedGroup.value || groupContacts.value.length === 0) return;
  
  if (!whatsappStore.connected) {
    alert('WhatsApp is not connected. Please wait for the connection to be established.');
    return;
  }

  validatingContacts.value = true;
  validationResults.value = null;
  
  try {
    const contactIds = groupContacts.value.map(c => c.id);
    const response = await axios.post('/api/whatsapp/validate-contacts', {
      contactIds
    });
    
    validationResults.value = response.data;
    
    // Refresh group contacts to show updated status
    await fetchGroupContacts(selectedGroup.value.id);
    
    // Show summary
    const { summary } = response.data;
    alert(
      `Validation complete!\n\n` +
      `Total: ${summary.total}\n` +
      `Valid: ${summary.valid}\n` +
      `Invalid: ${summary.invalid}\n` +
      `In Contacts: ${summary.inContacts}\n` +
      `Not in Contacts: ${summary.notInContacts}`
    );
  } catch (error: any) {
    console.error('Error validating contacts:', error);
    alert('Error validating contacts: ' + (error.response?.data?.error || error.message));
  } finally {
    validatingContacts.value = false;
  }
}

async function syncToWhatsApp() {
  if (!canSyncToWhatsApp.value || !selectedGroup.value) {
    return;
  }

  // Check WhatsApp connection
  if (!whatsappStore.connected) {
    alert('WhatsApp is not connected. Please wait for the connection to be established.');
    return;
  }

  if (groupContacts.value.length === 0) {
    alert('No contacts to sync');
    return;
  }

  // Get all contact phone numbers
  const participantPhones = groupContacts.value.map(c => c.phone).filter(phone => phone);

  if (participantPhones.length === 0) {
    alert('No valid phone numbers found in this group');
    return;
  }

  syncingToWhatsApp.value = true;
  try {
    if (whatsAppSyncAction.value === 'new') {
      // Create new WhatsApp group
      const groupName = newWhatsAppGroupName.value.trim() || selectedGroup.value.name;
      
      const response = await axios.post('/api/whatsapp/groups', {
        name: groupName,
        participantPhones
      });
      
      alert(`Successfully created WhatsApp group "${groupName}" and added ${participantPhones.length} contact(s)!`);
    } else {
      // Add to existing group
      if (!selectedWhatsAppGroupId.value) {
        alert('Please select a WhatsApp group');
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
    showSyncToWhatsAppModal.value = false;
  } catch (error: any) {
    alert('Error syncing to WhatsApp group: ' + (error.response?.data?.error || error.message));
  } finally {
    syncingToWhatsApp.value = false;
  }
}
</script>

