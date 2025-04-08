<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  'file-selected': [file: File]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dropzone = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const acceptedFileTypes = 'video/mp4,video/webm,audio/mpeg,audio/ogg,audio/wav'

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('file-selected', input.files[0])
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false

  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    const fileType = file.type

    if (acceptedFileTypes.includes(fileType)) {
      emit('file-selected', file)
    } else {
      alert('Please upload only video or audio files')
    }
  }
}

onMounted(() => {
  if (dropzone.value) {
    dropzone.value.addEventListener('dragover', handleDragOver)
    dropzone.value.addEventListener('dragleave', handleDragLeave)
    dropzone.value.addEventListener('drop', handleDrop)
  }
})

onUnmounted(() => {
  if (dropzone.value) {
    dropzone.value.removeEventListener('dragover', handleDragOver)
    dropzone.value.removeEventListener('dragleave', handleDragLeave)
    dropzone.value.removeEventListener('drop', handleDrop)
  }
})
</script>

<template>
  <div
    ref="dropzone"
    class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
    :class="{
      'border-primary bg-primary/5': isDragging,
      'border-slate-300 dark:border-slate-700': !isDragging,
    }"
  >
    <div class="flex flex-col items-center justify-center gap-4">
      <div class="flex flex-col items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-12 w-12 text-slate-400 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <h3 class="text-lg font-medium mb-1">Drag & drop your file here</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          or select a file from your computer
        </p>
      </div>

      <Button @click="triggerFileInput">Select File</Button>

      <input
        ref="fileInput"
        type="file"
        :accept="acceptedFileTypes"
        class="hidden"
        @change="handleFileChange"
      />

      <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Supports: MP4, WebM, MP3, OGG, WAV
      </p>
    </div>
  </div>
</template>
