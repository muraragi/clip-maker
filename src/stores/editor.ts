import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface TextOverlay {
  text: string
  position: string
  fontSize?: number
  color?: string
  fontFamily?: string
}

export const useEditorStore = defineStore('editor', () => {
  // File and media state
  const originalFile = ref<File | null>(null)
  const mediaSourceUrl = ref<string | null>(null)
  const processedFileBlob = ref<Blob | null>(null)

  // Timeline state
  const duration = ref(0)
  const currentTime = ref(0)
  const startTime = ref(0)
  const endTime = ref(0)

  // Edit settings
  const cropRect = ref<CropRect | null>(null)
  const selectedFilter = ref<string | null>(null)
  const textOverlay = ref<TextOverlay | null>(null)

  // Processing state
  const isFFmpegLoading = ref(true)
  const isProcessing = ref(false)
  const processingProgress = ref(0)

  // Actions
  const setFile = (file: File) => {
    if (mediaSourceUrl.value) {
      URL.revokeObjectURL(mediaSourceUrl.value)
    }
    originalFile.value = file
    mediaSourceUrl.value = URL.createObjectURL(file)

    // Reset state when new file is loaded
    processedFileBlob.value = null
    duration.value = 0
    currentTime.value = 0
    startTime.value = 0
    endTime.value = 0
    cropRect.value = null
    selectedFilter.value = null
    textOverlay.value = null
    processingProgress.value = 0
  }

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

  const setCropRect = (rect: CropRect | null) => {
    cropRect.value = rect
  }

  const setFilter = (filter: string | null) => {
    selectedFilter.value = filter
  }

  const setTextOverlay = (overlay: TextOverlay | null) => {
    textOverlay.value = overlay
  }

  const setFFmpegLoadingState = (loading: boolean) => {
    isFFmpegLoading.value = loading
  }

  const setProcessingState = (processing: boolean) => {
    isProcessing.value = processing
    if (!processing) {
      processingProgress.value = 0
    }
  }

  const updateProgress = (progress: number) => {
    processingProgress.value = progress
  }

  const setProcessedBlob = (blob: Blob | null) => {
    if (processedFileBlob.value) {
      URL.revokeObjectURL(URL.createObjectURL(processedFileBlob.value))
    }
    processedFileBlob.value = blob
  }

  const reset = () => {
    if (mediaSourceUrl.value) {
      URL.revokeObjectURL(mediaSourceUrl.value)
    }
    if (processedFileBlob.value) {
      URL.revokeObjectURL(URL.createObjectURL(processedFileBlob.value))
    }
    originalFile.value = null
    mediaSourceUrl.value = null
    processedFileBlob.value = null
    duration.value = 0
    currentTime.value = 0
    startTime.value = 0
    endTime.value = 0
    cropRect.value = null
    selectedFilter.value = null
    textOverlay.value = null
    processingProgress.value = 0
    isProcessing.value = false
  }

  return {
    // State
    originalFile,
    mediaSourceUrl,
    duration,
    currentTime,
    startTime,
    endTime,
    cropRect,
    selectedFilter,
    textOverlay,
    isFFmpegLoading,
    isProcessing,
    processingProgress,
    processedFileBlob,

    // Actions
    setFile,
    setDuration,
    setCurrentTime,
    setTimeRange,
    setCropRect,
    setFilter,
    setTextOverlay,
    setFFmpegLoadingState,
    setProcessingState,
    updateProgress,
    setProcessedBlob,
    reset,
  }
})
