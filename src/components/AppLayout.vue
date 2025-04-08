<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'

defineSlots<{
  default: () => unknown
}>()
</script>

<template>
  <Toaster />
  <div class="min-h-screen flex flex-col">
    <main class="flex-1 p-6">
      <slot />
    </main>
  </div>
</template>
