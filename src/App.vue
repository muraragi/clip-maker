<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppLayout from './components/AppLayout.vue'
import FileUpload from './components/FileUpload.vue'
import MediaPlayer from './components/MediaPlayer.vue'
import TimelineScrubber from './components/TimelineScrubber.vue'
import { useEditorStore } from './stores/editor'
import { useFFmpeg } from './composables/useFFmpeg'

const mediaRef = ref<InstanceType<typeof MediaPlayer> | null>(null)
const editorStore = useEditorStore()
const { loadFFmpeg, error: ffmpegError } = useFFmpeg()
const isPlaying = ref(false)

// Destructure store properties with storeToRefs for reactivity
const { originalFile, mediaSourceUrl, duration, currentTime, startTime, endTime, isFFmpegLoading } =
  storeToRefs(editorStore)

onMounted(async () => {
  await loadFFmpeg()
})

const handleFileSelected = (file: File) => {
  console.log('File selected:', file.name, file.type, file.size)
  editorStore.setFile(file)
}

const handleLoadedMetadata = (duration: number) => {
  editorStore.setDuration(duration)
}

const handleTimeUpdate = (currentTime: number) => {
  editorStore.setCurrentTime(currentTime)
}

const handleRangeUpdate = ([start, end]: [number, number]) => {
  editorStore.setTimeRange(start, end)
}

const handleSeek = (time: number) => {
  if (mediaRef.value) {
    mediaRef.value.seek(time)
  }
}

const handleTogglePlay = async () => {
  if (!mediaRef.value) return

  if (isPlaying.value) {
    await mediaRef.value.pause()
    isPlaying.value = false
  } else {
    await mediaRef.value.play()
    isPlaying.value = true
  }
}

const handlePlay = () => {
  isPlaying.value = true
}

const handlePause = () => {
  isPlaying.value = false
}
</script>

<template>
  <AppLayout>
    <div class="w-full max-w-[95vw] mx-auto">
      <!-- FFmpeg Loading State -->
      <div v-if="isFFmpegLoading" class="mb-4 p-4 bg-blue-50 text-blue-700 rounded-md">
        Loading video editor... Please wait.
      </div>

      <!-- FFmpeg Error State -->
      <div v-if="ffmpegError" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        Failed to initialize video editor: {{ ffmpegError.message }}
      </div>

      <div v-if="!mediaSourceUrl" class="mb-8">
        <FileUpload @file-selected="handleFileSelected" />
      </div>

      <div v-else class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">{{ originalFile?.name }}</h3>
          <button class="text-sm text-blue-500 hover:text-blue-700" @click="editorStore.reset()">
            Upload Different File
          </button>
        </div>

        <MediaPlayer
          ref="mediaRef"
          :src="mediaSourceUrl"
          @loadedmetadata="handleLoadedMetadata"
          @timeupdate="handleTimeUpdate"
          @play="handlePlay"
          @pause="handlePause"
        />

        <TimelineScrubber
          v-if="duration > 0"
          :duration="duration"
          :current-time="currentTime"
          :start-time="startTime"
          :end-time="endTime"
          :is-playing="isPlaying"
          @update:range="handleRangeUpdate"
          @seek="handleSeek"
          @toggle-play="handleTogglePlay"
        />

        <div class="text-sm text-slate-500">
          Duration: {{ Math.floor(duration / 60) }}:{{
            Math.floor(duration % 60)
              .toString()
              .padStart(2, '0')
          }}
        </div>
      </div>
    </div>
  </AppLayout>
</template>
