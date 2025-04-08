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

export interface TimelineSegment {
  start: number
  end: number
  id: string
}

export const useEditorStore = defineStore('editor', () => {
  const originalFile = ref<File | null>(null)
  const mediaSourceUrl = ref<string | null>(null)
  const processedFileBlob = ref<Blob | null>(null)

  const duration = ref(0)
  const currentTime = ref(0)
  const timelineSegments = ref<TimelineSegment[]>([])

  const cropRect = ref<CropRect | null>(null)
  const selectedFilter = ref<string | null>(null)
  const textOverlay = ref<TextOverlay | null>(null)

  const isFFmpegLoading = ref(true)
  const isProcessing = ref(false)
  const processingProgress = ref(0)

  const setFile = (file: File) => {
    if (mediaSourceUrl.value) {
      URL.revokeObjectURL(mediaSourceUrl.value)
    }
    originalFile.value = file
    mediaSourceUrl.value = URL.createObjectURL(file)

    processedFileBlob.value = null
    duration.value = 0
    currentTime.value = 0
    timelineSegments.value = []
    cropRect.value = null
    selectedFilter.value = null
    textOverlay.value = null
    processingProgress.value = 0
  }

  const setDuration = (value: number) => {
    duration.value = value

    if (timelineSegments.value.length === 0) {
      timelineSegments.value = [{ start: 0, end: value, id: crypto.randomUUID() }]
    }
  }

  const setCurrentTime = (value: number) => {
    currentTime.value = value
  }

  const setTimelineSegments = (segments: TimelineSegment[]) => {
    timelineSegments.value = segments
  }

  const getSelectedDuration = (): number => {
    return timelineSegments.value.reduce((total, segment) => {
      return total + (segment.end - segment.start)
    }, 0)
  }

  const isInActiveSegment = (): boolean => {
    return timelineSegments.value.some(
      (segment) => currentTime.value >= segment.start && currentTime.value <= segment.end,
    )
  }

  const getCurrentSegmentIndex = (): number => {
    return timelineSegments.value.findIndex(
      (segment) => currentTime.value >= segment.start && currentTime.value <= segment.end,
    )
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
    timelineSegments.value = []
    cropRect.value = null
    selectedFilter.value = null
    textOverlay.value = null
    processingProgress.value = 0
    isProcessing.value = false
  }

  return {
    originalFile,
    mediaSourceUrl,
    duration,
    currentTime,
    timelineSegments,
    cropRect,
    selectedFilter,
    textOverlay,
    isFFmpegLoading,
    isProcessing,
    processingProgress,
    processedFileBlob,

    setFile,
    setDuration,
    setCurrentTime,
    setTimelineSegments,
    getSelectedDuration,
    isInActiveSegment,
    getCurrentSegmentIndex,
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
