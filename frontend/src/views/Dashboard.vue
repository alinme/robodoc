<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Dashboard</h2>
      <p class="mt-1 text-sm text-gray-500">Overview of your RoboDoc activity</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading dashboard...</p>
    </div>

    <!-- Stats Grid -->
    <div v-else class="space-y-6">
      <!-- Main Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Contacts</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats?.totalContacts || 0 }}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-4 flex items-center text-sm">
            <span class="text-green-600 font-medium">+{{ stats?.contactsThisMonth || 0 }}</span>
            <span class="text-gray-500 ml-1">this month</span>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Groups</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats?.totalGroups || 0 }}</p>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-4 flex items-center text-sm">
            <span class="text-gray-500">Organize your contacts</span>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Messages Sent</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats?.totalMessages || 0 }}</p>
            </div>
            <div class="p-3 bg-purple-100 rounded-full">
              <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <div class="mt-4 flex items-center text-sm">
            <span class="text-green-600 font-medium">+{{ stats?.messagesToday || 0 }}</span>
            <span class="text-gray-500 ml-1">today</span>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Templates</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats?.totalTemplates || 0 }}</p>
            </div>
            <div class="p-3 bg-yellow-100 rounded-full">
              <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div class="mt-4 flex items-center text-sm">
            <span class="text-gray-500">Message templates</span>
          </div>
        </div>
      </div>

      <!-- Activity Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Messages Activity</h3>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Today</span>
              <span class="text-lg font-semibold text-gray-900">{{ stats?.messagesToday || 0 }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">This Week</span>
              <span class="text-lg font-semibold text-gray-900">{{ stats?.messagesThisWeek || 0 }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">This Month</span>
              <span class="text-lg font-semibold text-gray-900">{{ stats?.messagesThisMonth || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Contacts Activity</h3>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Today</span>
              <span class="text-lg font-semibold text-gray-900">{{ stats?.contactsToday || 0 }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">This Week</span>
              <span class="text-lg font-semibold text-gray-900">{{ stats?.contactsThisWeek || 0 }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">This Month</span>
              <span class="text-lg font-semibold text-gray-900">{{ stats?.contactsThisMonth || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Messages Status</h3>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Sent</span>
              <span class="text-lg font-semibold text-green-600">{{ (stats?.messagesByStatus?.sent || 0) + (stats?.messagesByStatus?.success || 0) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Pending</span>
              <span class="text-lg font-semibold text-yellow-600">{{ stats?.messagesByStatus?.pending || 0 }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Failed</span>
              <span class="text-lg font-semibold text-red-600">{{ stats?.messagesByStatus?.failed || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Groups and Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Groups -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Top Groups</h3>
          </div>
          <div class="p-6">
            <div v-if="stats?.topGroups?.length === 0" class="text-center py-8 text-gray-500">
              No groups yet
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="group in stats?.topGroups"
                :key="group.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                @click="$router.push(`/groups`)"
              >
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{{ group.name }}</p>
                  <p v-if="group.description" class="text-sm text-gray-500 mt-1">{{ group.description }}</p>
                </div>
                <div class="ml-4">
                  <span class="text-2xl font-bold text-blue-600">{{ group.contact_count }}</span>
                  <span class="text-sm text-gray-500 ml-1">contacts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Messages -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Recent Messages</h3>
          </div>
          <div class="p-6">
            <div v-if="stats?.recentMessages?.length === 0" class="text-center py-8 text-gray-500">
              No messages sent yet
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="message in stats?.recentMessages"
                :key="message.id"
                class="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex-1">
                  <p class="font-medium text-gray-900">
                    {{ message.contact_name || message.group_name || 'Unknown' }}
                  </p>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ formatDate(message.sent_at) }}
                  </p>
                </div>
                <div class="ml-4">
                  <span
                    :class="{
                      'bg-green-100 text-green-800': message.status === 'sent' || message.status === 'success',
                      'bg-yellow-100 text-yellow-800': message.status === 'pending',
                      'bg-red-100 text-red-800': message.status === 'failed'
                    }"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ message.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contacts Distribution and Recent Contacts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Contacts by Group -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Contacts by Group</h3>
          </div>
          <div class="p-6">
            <div v-if="stats?.contactsByGroup?.length === 0" class="text-center py-8 text-gray-500">
              No contacts yet
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="item in stats?.contactsByGroup"
                :key="item.group_name"
                class="flex items-center justify-between"
              >
                <span class="text-sm font-medium text-gray-700">{{ item.group_name }}</span>
                <div class="flex items-center gap-3">
                  <div class="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-blue-600 h-2 rounded-full"
                      :style="{ width: `${(item.count / stats.totalContacts) * 100}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-semibold text-gray-900 w-12 text-right">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Contacts -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Recent Contacts</h3>
          </div>
          <div class="p-6">
            <div v-if="stats?.recentContacts?.length === 0" class="text-center py-8 text-gray-500">
              No contacts yet
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="contact in stats?.recentContacts"
                :key="contact.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                @click="$router.push('/contacts')"
              >
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{{ contact.name }}</p>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ contact.phone }} • {{ contact.group_name || 'No Group' }}
                  </p>
                </div>
                <div class="ml-4 text-sm text-gray-500">
                  {{ formatDate(contact.created_at) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

const loading = ref(true);
const stats = ref<any>(null);

async function fetchStats() {
  loading.value = true;
  try {
    const response = await axios.get('/api/dashboard/stats');
    stats.value = response.data.stats;
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    alert('Error loading dashboard: ' + (error.response?.data?.error || error.message));
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString: string) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(() => {
  fetchStats();
  // Refresh stats every 30 seconds
  setInterval(fetchStats, 30000);
});
</script>

