<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useEditorStore } from '@/stores/editor'
import { useFFmpeg } from '@/composables/useFFmpeg'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'

defineSlots<{
  default: () => unknown
}>()

const editorStore = useEditorStore()
const { performEdit } = useFFmpeg()
const {
  originalFile,
  timelineSegments,
  cropRect,
  selectedFilter,
  textOverlay,
  isFFmpegLoading,
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

    // Create and trigger download in the browser
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = `edited_${originalFile.value.name}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.error(`Export failed: ${error}`)
  }
}
</script>

<template>
  <Toaster />
  <div class="min-h-screen flex flex-col">
    <header class="w-full max-w-[95vw] mx-auto py-4">
      <div class="flex justify-between items-center">
        <h1 class="text-lg font-bold">Quick Editor</h1>
        <div class="flex items-center gap-4">
          <div v-if="isProcessing" class="flex items-center gap-3 min-w-[200px]">
            <Progress :value="processingProgress" class="w-full" />
            <span class="text-sm text-muted-foreground whitespace-nowrap"
              >{{ processingProgress }}%</span
            >
          </div>
          <Button variant="default" :disabled="isExportDisabled" @click="handleExport">
            Export Video
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="flex-1 py-1.5 px-2">
      <slot />
    </main>
  </div>
</template>
