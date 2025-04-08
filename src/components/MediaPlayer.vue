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
const mediaType = computed(() => {
  if (props.type) return props.type

  const extension = props.src.split('.').pop()?.toLowerCase() || ''

  if (['mp3', 'ogg', 'wav', 'aac'].includes(extension)) {
    return 'audio'
  }

  return 'video'
})
const isSeekingBetweenSegments = ref(false)
const findSegmentForTime = (time: number) => {
  return props.timelineSegments.find((segment) => time >= segment.start && time <= segment.end)
}
const findNextSegment = (currentTime: number) => {
  const sortedSegments = [...props.timelineSegments].sort((a, b) => a.start - b.start)
  return sortedSegments.find((segment) => segment.start > currentTime)
}
const handleTimeUpdate = () => {
  if (!mediaRef.value || isSeekingBetweenSegments.value) return

  const currentTime = mediaRef.value.currentTime

  const currentSegment = findSegmentForTime(currentTime)

  if (currentSegment) {
    emit('timeupdate', currentTime, mediaRef.value.duration)

    if (currentTime + 0.1 >= currentSegment.end) {
      const nextSegment = findNextSegment(currentTime)
      if (nextSegment) {
        isSeekingBetweenSegments.value = true
        mediaRef.value.currentTime = nextSegment.start
        setTimeout(() => {
          isSeekingBetweenSegments.value = false
        }, 50)
      }
    }
  } else {
    const nextSegment = findNextSegment(currentTime)

    if (nextSegment) {
      isSeekingBetweenSegments.value = true
      mediaRef.value.currentTime = nextSegment.start
      setTimeout(() => {
        isSeekingBetweenSegments.value = false
      }, 50)
    } else {
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
watch(
  () => props.timelineSegments,
  (newSegments) => {
    if (!mediaRef.value || !newSegments.length) return

    const currentTime = mediaRef.value.currentTime
    const currentSegment = findSegmentForTime(currentTime)

    if (!currentSegment) {
      const firstSegment = [...newSegments].sort((a, b) => a.start - b.start)[0]
      if (firstSegment) {
        mediaRef.value.currentTime = firstSegment.start
      }
    }
  },
  { deep: true },
)

defineExpose({
  play: () => {
    if (mediaRef.value) {
      const currentTime = mediaRef.value.currentTime
      const currentSegment = findSegmentForTime(currentTime)

      if (!currentSegment) {
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
