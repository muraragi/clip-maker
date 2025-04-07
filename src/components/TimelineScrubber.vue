<script setup lang="ts">
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/vue'
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  duration: number
  currentTime: number
  startTime: number
  endTime: number
  isPlaying?: boolean
}>()

const emit = defineEmits<{
  'update:range': [[number, number]]
  seek: [number]
  'toggle-play': []
}>()

// Computed value for the slider's model
const range = computed(() => [props.startTime, props.endTime])

// Handle range updates from the slider
const handleRangeUpdate = (value: number[] | undefined) => {
  if (value && value.length === 2) {
    emit('update:range', [value[0], value[1]])
  }
}

// Handle click on the track for seeking
const handleTrackClick = (event: MouseEvent) => {
  const slider = event.currentTarget as HTMLDivElement
  const rect = slider.getBoundingClientRect()
  const percentage = (event.clientX - rect.left) / rect.width
  const time = percentage * props.duration
  emit('seek', Math.max(0, Math.min(time, props.duration)))
}

// Handle space key for play/pause
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

// Add and remove keyboard event listener
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="relative space-y-1.5">
    <!-- Play/Pause button and current time -->
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" class="h-7 w-7" @click="emit('toggle-play')">
        <Icon :icon="isPlaying ? 'radix-icons:pause' : 'radix-icons:play'" class="h-4 w-4" />
        <span class="sr-only">{{ isPlaying ? 'Pause' : 'Play' }}</span>
      </Button>
      <span class="text-sm text-slate-500">
        {{ Math.floor(currentTime / 60) }}:{{
          Math.floor(currentTime % 60)
            .toString()
            .padStart(2, '0')
        }}
        /
        {{ Math.floor(duration / 60) }}:{{
          Math.floor(duration % 60)
            .toString()
            .padStart(2, '0')
        }}
      </span>
    </div>

    <!-- Timeline slider -->
    <Slider
      :model-value="range"
      :min="0"
      :max="duration"
      :step="0.01"
      class="relative"
      @update:model-value="handleRangeUpdate"
      @click="handleTrackClick"
    />

    <!-- Time indicators -->
    <div class="flex justify-between text-xs text-slate-500">
      <span>{{ startTime.toFixed(1) }}s</span>
      <span>{{ endTime.toFixed(1) }}s</span>
    </div>
  </div>
</template>

<style scoped>
/* Custom styles for the slider to ensure proper positioning of elements */
:deep(.slider) {
  position: relative;
  z-index: 1;
}

:deep(.slider-track) {
  z-index: 2;
}

:deep(.slider-thumb) {
  z-index: 3;
}
</style>
