<script setup lang="ts">
import ThemeToggle from '@/components/ThemeToggle.vue'

defineSlots<{
  default: () => unknown
}>()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="p-4">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-xl font-bold">Quick Editor</h1>
        <ThemeToggle />
      </div>
    </header>

    <main class="flex-1 container mx-auto p-4">
      <slot />
    </main>
  </div>
</template>
