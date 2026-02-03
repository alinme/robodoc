<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <img src="@/assets/favicon.png" alt="RoboDoc" class="w-16 h-16 mx-auto rounded-md">
        
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 block">
          RoboDoc
        </h2>
        
        <p class="mt-2 text-center text-sm text-gray-600">
          Please enter your password to continue
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              required
              class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            />
          </div>
        </div>

        <div v-if="error" class="text-red-600 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {{ loading ? 'Logging in...' : 'Sign in' }}
          </button>
        </div>
        
        <div class="text-xs text-gray-500 text-center">
          <p>Default password: <code class="bg-gray-100 px-1 rounded">admin</code></p>
          <p class="mt-1">Please change it after first login in Settings.</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await axios.post('/api/auth/login', { password: password.value }, {
      withCredentials: true // Important for cookies
    });
    
    if (response.data.success) {
      router.push('/dashboard');
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

