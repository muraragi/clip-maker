<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TimelineSegment } from '@/stores/editor'

const props = defineProps<{
  src: string
  type?: 'video' | 'audio'
  timelineSegments: TimelineSegment[]
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

// Track if we're currently manually seeking between segments
const isSeekingBetweenSegments = ref(false)

// Find the segment that contains the given time
const findSegmentForTime = (time: number) => {
  return props.timelineSegments.find((segment) => time >= segment.start && time <= segment.end)
}

// Find the next segment after the current time
const findNextSegment = (currentTime: number) => {
  // Sort segments by start time
  const sortedSegments = [...props.timelineSegments].sort((a, b) => a.start - b.start)
  return sortedSegments.find((segment) => segment.start > currentTime)
}

const handleTimeUpdate = () => {
  if (!mediaRef.value || isSeekingBetweenSegments.value) return

  const currentTime = mediaRef.value.currentTime

  // Check if we're in an active segment
  const currentSegment = findSegmentForTime(currentTime)

  if (currentSegment) {
    // If within segment, just update time normally
    emit('timeupdate', currentTime, mediaRef.value.duration)

    // If we're approaching the end of a segment, prepare to seek to next segment
    if (currentTime + 0.1 >= currentSegment.end) {
      const nextSegment = findNextSegment(currentTime)

      if (nextSegment) {
        // We found a next segment, seek to its start
        isSeekingBetweenSegments.value = true
        mediaRef.value.currentTime = nextSegment.start
        setTimeout(() => {
          isSeekingBetweenSegments.value = false
        }, 50)
      }
    }
  } else {
    // We're outside any segment, find the next segment and seek to it
    const nextSegment = findNextSegment(currentTime)

    if (nextSegment) {
      // We found a next segment, seek to its start
      isSeekingBetweenSegments.value = true
      mediaRef.value.currentTime = nextSegment.start
      setTimeout(() => {
        isSeekingBetweenSegments.value = false
      }, 50)
    } else {
      // No next segment, we're at the end
      mediaRef.value.pause()
      emit('pause')
    }
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

// Watch for changes in timeline segments and adjust playback if needed
watch(
  () => props.timelineSegments,
  (newSegments) => {
    if (!mediaRef.value || !newSegments.length) return

    const currentTime = mediaRef.value.currentTime
    const currentSegment = findSegmentForTime(currentTime)

    if (!currentSegment) {
      // Current time is not in any segment, seek to the start of the first segment
      const firstSegment = [...newSegments].sort((a, b) => a.start - b.start)[0]
      if (firstSegment) {
        mediaRef.value.currentTime = firstSegment.start
      }
    }
  },
  { deep: true },
)

// Public methods that can be accessed via template refs
defineExpose({
  play: () => {
    if (mediaRef.value) {
      const currentTime = mediaRef.value.currentTime
      const currentSegment = findSegmentForTime(currentTime)

      if (!currentSegment) {
        // If not in a segment, find the first segment and start from there
        const firstSegment = [...props.timelineSegments].sort((a, b) => a.start - b.start)[0]
        if (firstSegment) {
          mediaRef.value.currentTime = firstSegment.start
        }
      }

      mediaRef.value.play()
    }
  },
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
      class="w-full h-[calc(100vh-284px)] object-contain"
      preload="metadata"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @play="handlePlay"
      @pause="handlePause"
    />
  </div>
</template>
