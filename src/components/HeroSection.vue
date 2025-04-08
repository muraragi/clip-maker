<script setup lang="ts">
import { Scissors, Monitor, Shield } from 'lucide-vue-next'
import FileUpload from './FileUpload.vue'

defineEmits<{
  (e: 'file-selected', file: File): void
}>()
</script>

<template>
  <div class="py-12 px-4 text-center">
    <h1 class="text-4xl font-bold mb-4">Simple Video Editor</h1>
    <p class="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
      Edit, trim, and enhance your videos in seconds. No software installation required. Just upload
      your file and start editing right in your browser.
    </p>

    <div class="max-w-xl mx-auto">
      <FileUpload @file-selected="$emit('file-selected', $event)" />
    </div>

    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
      <div class="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
        <div class="flex items-center gap-2 mb-2">
          <Scissors class="h-5 w-5 text-primary" />
          <h3 class="font-medium text-lg">Easy Trimming</h3>
        </div>
        <p class="text-slate-600 dark:text-slate-400">
          Quickly cut unwanted parts from your videos with our intuitive timeline editor.
        </p>
      </div>
      <div class="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
        <div class="flex items-center gap-2 mb-2">
          <Monitor class="h-5 w-5 text-primary" />
          <h3 class="font-medium text-lg">Browser-Based</h3>
        </div>
        <p class="text-slate-600 dark:text-slate-400">
          No downloads needed. Edit your videos directly in your browser with professional results.
        </p>
      </div>
      <div class="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
        <div class="flex items-center gap-2 mb-2">
          <Shield class="h-5 w-5 text-primary" />
          <h3 class="font-medium text-lg">Privacy First</h3>
        </div>
        <p class="text-slate-600 dark:text-slate-400">
          Your videos never leave your device. All processing happens locally in your browser.
        </p>
      </div>
    </div>
  </div>
</template>
