<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <router-link to="/" class="cursor-pointer">
                  <LogoNew />
                </router-link>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <router-link
                v-for="item in navigation"
                :key="item.name"
                :to="item.to"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer"
                active-class="border-green-500 text-gray-900"
              >
                {{ item.name }}
              </router-link>
              
              <!-- Communication Group Dropdown -->
              <div class="relative flex items-center">
                <button
                  @click="showCommDropdown = !showCommDropdown"
                  :class="[
                    'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer',
                    isCommGroupActive ? 'border-green-500 text-gray-900' : ''
                  ]"
                >
                  Communication
                  <svg 
                    class="ml-1 h-4 w-4 transition-transform"
                    :class="{ 'rotate-180': showCommDropdown }"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  v-if="showCommDropdown"
                  class="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                  @click.stop
                >
                  <router-link
                    v-for="item in communicationGroup"
                    :key="item.name"
                    :to="item.to"
                    @click="showCommDropdown = false"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    active-class="bg-green-50 text-green-700"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center" />
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import LogoNew from '@/components/LogoNew.vue';

const route = useRoute();
const showCommDropdown = ref(false);

const navigation = [
  { name: 'Upload', to: '/upload' },
  { name: 'Centralizator', to: '/centralizator' },
  { name: 'Protocol Compare', to: '/protocol-compare' },
  { name: 'Orders', to: '/orders' },
  { name: 'Templates', to: '/templates' },
  { name: 'Settings', to: '/settings' }
];

const communicationGroup = [
  { name: 'Contacts', to: '/contacts' },
  { name: 'Groups', to: '/groups' },
  { name: 'Calls', to: '/calls' },
  { name: 'Messages', to: '/messages' }
];

const isCommGroupActive = computed(() => {
  return communicationGroup.some(item => route.path.startsWith(item.to));
});

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.relative.flex.items-center')) {
    showCommDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

