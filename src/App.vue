<script setup lang="ts">
import { ref } from 'vue'
import AppLayout from './components/AppLayout.vue'
import FileUpload from './components/FileUpload.vue'
import MediaPlayer from './components/MediaPlayer.vue'

const selectedFile = ref<File | null>(null)
const mediaUrl = ref<string | null>(null)
const mediaDuration = ref(0)

const handleFileSelected = (file: File) => {
  console.log('File selected:', file.name, file.type, file.size)

  // Create a blob URL for the file
  if (mediaUrl.value) {
    URL.revokeObjectURL(mediaUrl.value)
  }

  selectedFile.value = file
  mediaUrl.value = URL.createObjectURL(file)
}

const handleLoadedMetadata = (duration: number) => {
  mediaDuration.value = duration
}
</script>

<template>
  <AppLayout>
    <div class="max-w-4xl mx-auto">
      <div v-if="!mediaUrl" class="mb-8">
        <FileUpload @file-selected="handleFileSelected" />
      </div>

      <div v-else class="space-y-6">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">{{ selectedFile?.name }}</h3>
          <button
            class="text-sm text-blue-500 hover:text-blue-700"
            @click="
              () => {
                mediaUrl = null
                selectedFile = null
              }
            "
          >
            Upload Different File
          </button>
        </div>

        <MediaPlayer :src="mediaUrl" @loadedmetadata="handleLoadedMetadata" />

        <div class="text-sm text-slate-500">
          Duration: {{ Math.floor(mediaDuration / 60) }}:{{
            Math.floor(mediaDuration % 60)
              .toString()
              .padStart(2, '0')
          }}
        </div>
      </div>
    </div>
  </AppLayout>
</template>
