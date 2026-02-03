<template>
  <div class="space-y-6">
    <section>
      <h2 class="text-3xl font-bold text-gray-900">Protocol Compare</h2>
      <p class="mt-1 text-sm text-gray-500">
        Upload two Excel files to review them side by side. Each panel keeps its own filters and edits.
      </p>
    </section>

    <section class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">File A</h3>
        <ProtocolCheck :hideHeader="true" />
      </div>

      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">File B</h3>
        <ProtocolCheck :hideHeader="true" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import ProtocolCheck from '@/views/ProtocolCheck.vue';
</script>
