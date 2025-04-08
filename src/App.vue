<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppLayout from './components/AppLayout.vue'
import HeroSection from './components/HeroSection.vue'
import MediaPlayer from './components/MediaPlayer.vue'
import TimelineScrubber from './components/TimelineScrubber.vue'
import { useEditorStore } from './stores/editor'
import { useFFmpeg } from './composables/useFFmpeg'
import type { TimelineSegment } from './stores/editor'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const mediaRef = ref<InstanceType<typeof MediaPlayer> | null>(null)
const editorStore = useEditorStore()
const { loadFFmpeg, error: ffmpegError, performEdit } = useFFmpeg()
const isPlaying = ref(false)

const {
  originalFile,
  mediaSourceUrl,
  duration,
  currentTime,
  timelineSegments,
  isFFmpegLoading,
  cropRect,
  selectedFilter,
  textOverlay,
  isProcessing,
  processingProgress,
} = storeToRefs(editorStore)

const isExportDisabled = computed(() => {
  return (
    !originalFile.value ||
    isFFmpegLoading.value ||
    isProcessing.value ||
    timelineSegments.value.length === 0
  )
})

const handleExport = async () => {
  if (!originalFile.value) return

  try {
    const result = await performEdit({
      inputFile: originalFile.value,
      timelineSegments: timelineSegments.value,
      cropRect: cropRect.value,
      filter: selectedFilter.value,
      textOverlay: textOverlay.value,
    })

    editorStore.setProcessedBlob(result)

    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = `clip_maker_${originalFile.value.name}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.error(`Export failed: ${error}`)
  }
}

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

const handleSegmentsUpdate = (segments: TimelineSegment[]) => {
  editorStore.setTimelineSegments(segments)
}

const handleSeek = (time: number) => {
  if (mediaRef.value) {
    mediaRef.value.seek(time)
  }
}

const handleTogglePlay = async () => {
  if (!mediaRef.value) return

  if (isPlaying.value) {
    mediaRef.value.pause()
    isPlaying.value = false
  } else {
    mediaRef.value.play()
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
    <div class="w-full mx-auto">
      <div v-if="isFFmpegLoading" class="mb-4 p-4 bg-blue-50 text-blue-700 rounded-md">
        Loading video editor... Please wait.
      </div>

      <div v-if="ffmpegError" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        Failed to initialize video editor: {{ ffmpegError.message }}
      </div>

      <div v-if="!mediaSourceUrl" class="mb-8">
        <HeroSection @file-selected="handleFileSelected" />
      </div>

      <div v-else class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">{{ originalFile?.name }}</h3>
          <div class="flex gap-3 items-center">
            <div v-if="isProcessing" class="flex items-center gap-3 min-w-[200px]">
              <Progress :value="processingProgress" class="w-full" />
              <span class="text-sm text-muted-foreground whitespace-nowrap"
                >{{ processingProgress }}%</span
              >
            </div>
            <Button size="sm" variant="ghost" @click="editorStore.reset()">
              Upload Different File
            </Button>
            <Button size="sm" variant="default" :disabled="isExportDisabled" @click="handleExport">
              Save Clip
            </Button>
          </div>
        </div>

        <MediaPlayer
          ref="mediaRef"
          :src="mediaSourceUrl"
          :timeline-segments="timelineSegments"
          @loadedmetadata="handleLoadedMetadata"
          @timeupdate="handleTimeUpdate"
          @play="handlePlay"
          @pause="handlePause"
        />

        <TimelineScrubber
          v-if="duration > 0"
          :duration="duration"
          :current-time="currentTime"
          :is-playing="isPlaying"
          @update:segments="handleSegmentsUpdate"
          @seek="handleSeek"
          @toggle-play="handleTogglePlay"
        />
      </div>
    </div>
  </AppLayout>
</template>
