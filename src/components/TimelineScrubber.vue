<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/vue'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'

interface Segment {
  start: number
  end: number
  id: string
}

const props = defineProps<{
  duration: number
  currentTime: number
  isPlaying?: boolean
}>()

const emit = defineEmits<{
  seek: [number]
  'toggle-play': []
  'update:segments': [Segment[]]
}>()

const segments = ref<Segment[]>([{ start: 0, end: props.duration, id: crypto.randomUUID() }])

watch(
  () => props.duration,
  (newDuration) => {
    if (segments.value.length === 1 && segments.value[0].end === 0) {
      segments.value = [{ start: 0, end: newDuration, id: segments.value[0].id }]
    }
  },
  { immediate: true },
)

const totalSelectedDuration = computed(() => {
  return segments.value.reduce((total, segment) => {
    return total + (segment.end - segment.start)
  }, 0)
})

const currentSegmentIndex = computed(() => {
  return segments.value.findIndex(
    (segment) => props.currentTime >= segment.start && props.currentTime <= segment.end,
  )
})

const handleTimelineClick = (event: MouseEvent) => {
  const timeline = event.currentTarget as HTMLDivElement
  const rect = timeline.getBoundingClientRect()
  const percentage = (event.clientX - rect.left) / rect.width
  const time = percentage * props.duration
  emit('seek', Math.max(0, Math.min(time, props.duration)))
}

const isDragging = ref(false)
const dragType = ref<'playhead' | 'startHandle' | 'endHandle' | null>(null)
const dragSegmentId = ref<string | null>(null)

const startDrag = (type: 'playhead' | 'startHandle' | 'endHandle', segmentId?: string) => {
  isDragging.value = true
  dragType.value = type
  if (segmentId) {
    dragSegmentId.value = segmentId
  }
}

const handleDrag = (event: MouseEvent) => {
  if (!isDragging.value || !dragType.value) return

  const timeline = document.getElementById('timeline-container')
  if (!timeline) return

  const rect = timeline.getBoundingClientRect()
  const percentage = (event.clientX - rect.left) / rect.width
  const time = Math.max(0, Math.min(percentage * props.duration, props.duration))

  if (dragType.value === 'playhead') {
    emit('seek', time)
    return
  }

  if (dragSegmentId.value && (dragType.value === 'startHandle' || dragType.value === 'endHandle')) {
    const segmentIndex = segments.value.findIndex((s) => s.id === dragSegmentId.value)
    if (segmentIndex === -1) return

    const updatedSegments = [...segments.value]
    const segment = { ...updatedSegments[segmentIndex] }

    if (dragType.value === 'startHandle') {
      segment.start = Math.min(time, segment.end - 0.1)
    } else {
      segment.end = Math.max(time, segment.start + 0.1)
    }

    updatedSegments[segmentIndex] = segment
    segments.value = updatedSegments
    emit('update:segments', updatedSegments)
  }
}

const endDrag = () => {
  isDragging.value = false
  dragType.value = null
  dragSegmentId.value = null
}

const splitSegmentAtPlayhead = () => {
  const segmentIndex = currentSegmentIndex.value
  if (segmentIndex === -1) return

  const segment = segments.value[segmentIndex]

  if (
    Math.abs(props.currentTime - segment.start) < 0.1 ||
    Math.abs(props.currentTime - segment.end) < 0.1
  ) {
    return
  }

  const newSegments = [...segments.value]
  newSegments.splice(
    segmentIndex,
    1,
    { start: segment.start, end: props.currentTime, id: crypto.randomUUID() },
    { start: props.currentTime, end: segment.end, id: crypto.randomUUID() },
  )

  segments.value = newSegments
  emit('update:segments', newSegments)
}

const deleteSegment = (segmentId: string) => {
  const filteredSegments = segments.value.filter((s) => s.id !== segmentId)
  if (filteredSegments.length === 0) {
  }

  segments.value = filteredSegments
  emit('update:segments', filteredSegments)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (
    event.code === 'Space' &&
    !event.repeat &&
    !(event.target as HTMLElement).matches('input, textarea, button')
  ) {
    event.preventDefault()
    emit('toggle-play')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mousemove', handleDrag)
  window.addEventListener('mouseup', endDrag)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mousemove', handleDrag)
  window.removeEventListener('mouseup', endDrag)
})

const playheadPosition = computed(() => {
  return (props.currentTime / props.duration) * 100
})

const segmentStyles = computed(() => {
  return segments.value.map((segment) => ({
    left: `${(segment.start / props.duration) * 100}%`,
    width: `${((segment.end - segment.start) / props.duration) * 100}%`,
    id: segment.id,
  }))
})

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}
</script>

<template>
  <div class="space-y-2">
    <!-- Controls and time display -->
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" class="h-7 w-7" @click="emit('toggle-play')">
        <Icon :icon="isPlaying ? 'radix-icons:pause' : 'radix-icons:play'" class="h-4 w-4" />
        <span class="sr-only">{{ isPlaying ? 'Pause' : 'Play' }}</span>
      </Button>

      <span class="text-sm text-slate-500">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }} (Selected:
        {{ formatTime(totalSelectedDuration) }})
      </span>

      <div class="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-7 px-2"
          @click="splitSegmentAtPlayhead"
          :disabled="currentSegmentIndex === -1"
        >
          <Icon icon="mdi:content-cut" class="h-4 w-4 mr-1" />
          Split
        </Button>
      </div>
    </div>

    <!-- Timeline view -->
    <div
      id="timeline-container"
      class="relative h-20 bg-slate-800 rounded-md border border-slate-700 overflow-hidden"
      @click="handleTimelineClick"
      @mousedown="startDrag('playhead')"
    >
      <!-- Time markers -->
      <div class="absolute top-0 left-0 w-full h-5 flex border-b border-slate-700">
        <div
          v-for="i in 10"
          :key="i"
          class="flex-1 border-r border-slate-700 text-[10px] text-slate-400 px-1"
        >
          {{ formatTime((i - 1) * (duration / 10)) }}
        </div>
      </div>

      <!-- Inactive background -->
      <div class="absolute top-5 left-0 w-full h-[calc(100%-5px)] bg-slate-700"></div>

      <!-- Active segments -->
      <div
        v-for="style in segmentStyles"
        :key="style.id"
        class="absolute top-5 h-[calc(100%-5px)] bg-slate-500 border-l border-r border-slate-400"
        :style="{ left: style.left, width: style.width }"
      >
        <!-- Start handle -->
        <div
          class="absolute top-0 left-0 w-2 h-full bg-blue-500 cursor-ew-resize hover:bg-blue-400"
          @mousedown.stop="startDrag('startHandle', style.id)"
        ></div>

        <!-- End handle -->
        <div
          class="absolute top-0 right-0 w-2 h-full bg-blue-500 cursor-ew-resize hover:bg-blue-400"
          @mousedown.stop="startDrag('endHandle', style.id)"
        ></div>

        <!-- Delete button -->
        <Button
          v-if="segments.length > 1"
          variant="destructive"
          size="icon"
          class="absolute top-1 right-3 h-5 w-5 opacity-50 hover:opacity-100"
          @click.stop="deleteSegment(style.id)"
        >
          <Icon icon="radix-icons:cross-2" class="h-3 w-3" />
        </Button>
      </div>

      <!-- Playhead -->
      <div
        class="absolute top-0 bottom-0 w-[3px] bg-fuchsia-500 z-10"
        :style="{ left: `calc(${playheadPosition}% - 1.5px)` }"
        @mousedown.stop="startDrag('playhead')"
      >
        <div
          class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-fuchsia-500 rounded-full"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure the cursor shows as pointer over the timeline */
#timeline-container {
  cursor: pointer;
}

/* Custom cursor for dragging */
#timeline-container.dragging {
  cursor: grabbing;
}
</style>
