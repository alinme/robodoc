<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Call Contacts</h2>
      <p class="mt-1 text-sm text-gray-500">
        Keep track of your phone and WhatsApp calls, update counters, and note any observations when contacts do not answer.
      </p>
    </div>

    <div class="bg-white shadow rounded-lg p-6">
      <div class="grid gap-4 lg:grid-cols-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Group</label>
          <select
            v-model="selectedGroupId"
            class="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option :value="null">All Groups</option>
            <option
              v-for="group in groups"
              :key="group.id"
              :value="group.id"
            >
              {{ group.name }}
            </option>
          </select>
        </div>
        <div class="lg:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Search Contacts</label>
          <div class="flex gap-2">
            <input
              v-model="searchTerm"
              @input="handleSearchInput"
              type="text"
              placeholder="Search by name, phone, or business"
              class="flex-1 border border-gray-300 rounded-md px-3 py-2"
            />
            <button
              type="button"
              @click="resetFilters"
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 bg-white shadow rounded-lg">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h3 class="text-lg font-medium text-gray-900">Contacts to Call</h3>
          <p class="text-sm text-gray-500">
            {{ calls.length }} contact(s) shown
          </p>
        </div>
        <button
          type="button"
          @click="refresh"
          :disabled="loading"
          class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Counter</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Call</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Call Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-if="loading">
              <td colspan="7" class="px-6 py-10 text-center text-gray-500">
                Loading contacts...
              </td>
            </tr>
            <tr v-else-if="calls.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-gray-500">
                No contacts found. Adjust your filters or add contacts first.
              </td>
            </tr>
            <tr
              v-for="record in calls"
              :key="record.contact_id"
              class="align-top"
            >
              <td class="px-6 py-4 text-sm font-medium text-gray-900">
                {{ record.name }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                <div>{{ formatPhoneForDisplay(record.phone) }}</div>
                <div class="text-xs text-gray-400 mt-1">
                  {{ record.phone }}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ record.group_name || '—' }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ record.business || '—' }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700">
                <div class="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                  <button
                    type="button"
                    class="w-6 h-6 rounded-full bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="counterLoading[record.contact_id]"
                    @click="adjustCounter(record, -1)"
                  >
                    −
                  </button>
                  <span class="text-base font-semibold text-gray-900 min-w-[2rem] text-center">
                    {{ record.call_count }}
                  </span>
                  <button
                    type="button"
                    class="w-6 h-6 rounded-full bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="counterLoading[record.contact_id]"
                    @click="adjustCounter(record, 1)"
                  >
                    +
                  </button>
                </div>
                <div v-if="counterError[record.contact_id]" class="mt-2 text-xs text-red-500">
                  {{ counterError[record.contact_id] }}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                <div v-if="record.last_called_at">
                  {{ formatTimestamp(record.last_called_at) }}
                </div>
                <div v-else class="text-gray-400">No calls yet</div>
                <div v-if="record.last_call_type" class="text-xs text-gray-500 mt-1">
                  Last via {{ record.last_call_type === 'whatsapp' ? 'WhatsApp' : 'Phone' }}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700">
                <div class="flex flex-col gap-2">
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-green-300 disabled:cursor-not-allowed"
                      :disabled="Boolean(callLoading[record.contact_id])"
                      @click="callContact(record, 'whatsapp')"
                    >
                      {{ callLoading[record.contact_id] === 'whatsapp' ? 'Calling...' : 'Call WhatsApp' }}
                    </button>
                    <button
                      type="button"
                      class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:bg-blue-300 disabled:cursor-not-allowed"
                      :disabled="Boolean(callLoading[record.contact_id])"
                      @click="callContact(record, 'phone')"
                    >
                      {{ callLoading[record.contact_id] === 'phone' ? 'Calling...' : 'Call Phone' }}
                    </button>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">
                      Observations
                    </label>
                    <textarea
                      v-model="observationDrafts[record.contact_id]"
                      rows="2"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="Add notes if the contact did not answer..."
                    />
                    <div class="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        :disabled="observationSaving[record.contact_id]"
                        @click="saveObservations(record)"
                      >
                        {{ observationSaving[record.contact_id] ? 'Saving...' : 'Save Notes' }}
                      </button>
                      <span
                        v-if="observationSuccess[record.contact_id]"
                        class="text-xs text-green-600"
                      >
                        Saved
                      </span>
                    </div>
                    <div v-if="observationError[record.contact_id]" class="mt-1 text-xs text-red-500">
                      {{ observationError[record.contact_id] }}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useCallsStore } from '@/stores/calls';
import { useGroupsStore } from '@/stores/groups';
import { formatPhoneForDisplay } from '@/utils/phoneValidator';
import type { CallRecord } from '@/types/call';

const callsStore = useCallsStore();
const groupsStore = useGroupsStore();

const { records: callRecords, loading: callsLoading } = storeToRefs(callsStore);
const { groups: groupList } = storeToRefs(groupsStore);

const selectedGroupId = ref<number | null>(null);
const searchTerm = ref('');
const searchTimeout = ref<number | null>(null);

const observationDrafts = ref<Record<number, string>>({});
const observationSaving = ref<Record<number, boolean>>({});
const observationSuccess = ref<Record<number, boolean>>({});
const observationError = ref<Record<number, string>>({});
const counterLoading = ref<Record<number, boolean>>({});
const counterError = ref<Record<number, string>>({});
const callLoading = ref<Record<number, 'phone' | 'whatsapp' | null>>({});

const calls = computed<CallRecord[]>(() => callRecords.value ?? []);
const loading = computed(() => callsLoading.value);
const groups = computed(() => groupList.value ?? []);

function initializeDrafts(records: CallRecord[] | undefined) {
  if (!records || records.length === 0) {
    observationDrafts.value = {};
    return;
  }
  const drafts: Record<number, string> = {};
  records.forEach(record => {
    drafts[record.contact_id] = record.observations || '';
  });
  observationDrafts.value = drafts;
}

async function refresh() {
  await callsStore.fetchRecords({ offset: 0 });
}

function formatTimestamp(timestamp: string) {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

function formatPhoneForLink(phone: string) {
  return phone.replace(/[^\d+]/g, '').replace(/^00/, '+');
}

function formatPhoneForLocalCall(phone: string) {
  const digitsOnly = phone.replace(/[^\d]/g, '');

  if (!digitsOnly) {
    return phone;
  }

  let normalized = digitsOnly;

  if (normalized.startsWith('00')) {
    normalized = normalized.slice(2);
  }

  if (normalized.startsWith('40')) {
    return `0${normalized.slice(2)}`;
  }

  if (normalized.startsWith('4')) {
    return `0${normalized.slice(1)}`;
  }

  if (normalized.startsWith('0')) {
    return normalized;
  }

  return normalized;
}

function handleSearchInput() {
  if (searchTimeout.value) {
    window.clearTimeout(searchTimeout.value);
  }
  searchTimeout.value = window.setTimeout(async () => {
    callsStore.setFilters({
      search: searchTerm.value.trim() || '',
      offset: 0
    });
    await refresh();
  }, 400);
}

async function resetFilters() {
  selectedGroupId.value = null;
  searchTerm.value = '';
  callsStore.setFilters({ groupId: null, search: '', offset: 0 });
  await refresh();
}

async function adjustCounter(record: CallRecord, delta: number) {
  if (counterLoading.value[record.contact_id]) return;

  const newCount = Math.max(0, (record.call_count || 0) + delta);
  counterLoading.value = { ...counterLoading.value, [record.contact_id]: true };
  counterError.value = { ...counterError.value, [record.contact_id]: '' };

  try {
    await callsStore.updateCallDetails(record.contact_id, { callCount: newCount });
  } catch (error: any) {
    counterError.value = {
      ...counterError.value,
      [record.contact_id]: error.message || 'Error updating counter'
    };
  } finally {
    counterLoading.value = { ...counterLoading.value, [record.contact_id]: false };
  }
}

async function saveObservations(record: CallRecord) {
  if (observationSaving.value[record.contact_id]) return;

  observationSaving.value = { ...observationSaving.value, [record.contact_id]: true };
  observationSuccess.value = { ...observationSuccess.value, [record.contact_id]: false };
  observationError.value = { ...observationError.value, [record.contact_id]: '' };

  try {
    await callsStore.updateCallDetails(record.contact_id, {
      observations: observationDrafts.value[record.contact_id] || ''
    });
    observationSuccess.value = { ...observationSuccess.value, [record.contact_id]: true };
    window.setTimeout(() => {
      observationSuccess.value = { ...observationSuccess.value, [record.contact_id]: false };
    }, 1500);
  } catch (error: any) {
    observationError.value = {
      ...observationError.value,
      [record.contact_id]: error.message || 'Error saving observations'
    };
  } finally {
    observationSaving.value = { ...observationSaving.value, [record.contact_id]: false };
  }
}

async function callContact(record: CallRecord, type: 'phone' | 'whatsapp') {
  if (callLoading.value[record.contact_id]) return;

  callLoading.value = { ...callLoading.value, [record.contact_id]: type };
  const observation = observationDrafts.value[record.contact_id] || null;

  try {
    await callsStore.recordCall(record.contact_id, type, observation);
    if (type === 'phone') {
      const localNumber = formatPhoneForLocalCall(record.phone);
      window.open(`tel:${localNumber}`, '_blank');
    } else {
      const sanitizedPhone = formatPhoneForLink(record.phone).replace(/\+/g, '');
      window.open(`https://wa.me/${sanitizedPhone}`, '_blank');
    }
  } catch (error: any) {
    observationError.value = {
      ...observationError.value,
      [record.contact_id]: error.message || 'Error recording call'
    };
  } finally {
    callLoading.value = { ...callLoading.value, [record.contact_id]: null };
    await refresh();
  }
}

watch(
  () => callRecords.value,
  (records) => {
    initializeDrafts(records);
  },
  { immediate: true }
);

watch(selectedGroupId, async (groupId) => {
  callsStore.setFilters({ groupId: groupId || null, offset: 0 });
  await refresh();
});

onMounted(async () => {
  await groupsStore.fetchGroups();
  await refresh();
});
</script>


