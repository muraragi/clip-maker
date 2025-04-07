import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTimelineStore = defineStore('timeline', () => {
  const duration = ref(0)
  const currentTime = ref(0)
  const startTime = ref(0)
  const endTime = ref(0)

  const setDuration = (value: number) => {
    duration.value = value
    // Initialize endTime to full duration when media is loaded
    endTime.value = value
  }

  const setCurrentTime = (value: number) => {
    currentTime.value = value
  }

  const setTimeRange = (start: number, end: number) => {
    startTime.value = start
    endTime.value = end
  }

  return {
    duration,
    currentTime,
    startTime,
    endTime,
    setDuration,
    setCurrentTime,
    setTimeRange,
  }
})
