<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  src: string
  type?: 'video' | 'audio'
}>()

const emit = defineEmits<{
  timeupdate: [currentTime: number, duration: number]
  loadedmetadata: [duration: number]
  play: []
  pause: []
}>()

const mediaRef = ref<HTMLVideoElement | HTMLAudioElement | null>(null)

// Determine media type based on src extension if not explicitly provided
const mediaType = computed(() => {
  if (props.type) return props.type

  const extension = props.src.split('.').pop()?.toLowerCase() || ''

  // Audio extensions
  if (['mp3', 'ogg', 'wav', 'aac'].includes(extension)) {
    return 'audio'
  }

  // Default to video
  return 'video'
})

const handleTimeUpdate = () => {
  if (mediaRef.value) {
    emit('timeupdate', mediaRef.value.currentTime, mediaRef.value.duration)
  }
}

const handleLoadedMetadata = () => {
  if (mediaRef.value) {
    emit('loadedmetadata', mediaRef.value.duration)
  }
}

const handlePlay = () => {
  emit('play')
}

const handlePause = () => {
  emit('pause')
}

// Public methods that can be accessed via template refs
defineExpose({
  play: () => mediaRef.value?.play(),
  pause: () => mediaRef.value?.pause(),
  seek: (time: number) => {
    if (mediaRef.value) {
      mediaRef.value.currentTime = time
    }
  },
})
</script>

<template>
  <div class="w-full rounded-lg overflow-hidden shadow-lg bg-slate-900">
    <component
      :is="mediaType"
      ref="mediaRef"
      :src="src"
      class="w-full max-h-[70vh] object-contain"
      controls
      preload="metadata"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @play="handlePlay"
      @pause="handlePause"
    />
  </div>
</template>
