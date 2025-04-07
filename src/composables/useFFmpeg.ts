import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { useEditorStore } from '@/stores/editor'
import type { CropRect, TextOverlay } from '@/stores/editor'

// Use a singleton instance of FFmpeg
let ffmpeg: FFmpeg | null = null

export function useFFmpeg() {
  const error = ref<Error | null>(null)
  const editorStore = useEditorStore()

  const loadFFmpeg = async () => {
    try {
      if (!ffmpeg) {
        ffmpeg = new FFmpeg()

        // Get the base URL for the application
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.9/dist/esm'

        // Load FFmpeg using public URL paths
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        })

        // Setup progress callback
        ffmpeg.on('progress', ({ progress }) => {
          editorStore.updateProgress(Math.round(progress * 100))
        })
      }

      editorStore.setFFmpegLoadingState(false)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to load FFmpeg')
      console.error('Failed to load FFmpeg:', e)
      editorStore.setFFmpegLoadingState(false)
    }
  }

  const getFFmpeg = () => {
    if (!ffmpeg) {
      throw new Error('FFmpeg not initialized. Call loadFFmpeg first.')
    }
    return ffmpeg
  }

  interface EditOptions {
    inputFile: File | Blob
    startTime?: number
    endTime?: number
    cropRect?: CropRect | null
    filter?: string | null
    textOverlay?: TextOverlay | null
  }

  const performEdit = async (options: EditOptions): Promise<Blob> => {
    const editorStore = useEditorStore()
    const instance = getFFmpeg()

    try {
      editorStore.setProcessingState(true)

      // File names
      const inputFileName = 'input.mp4'
      const outputFileName = 'output.mp4'

      // Convert input to FFmpeg-compatible format and write to virtual filesystem
      const inputData = await fetchFile(options.inputFile)
      await instance.writeFile(inputFileName, inputData)

      // Construct FFmpeg command arguments
      const args: string[] = []

      // Input file
      args.push('-i', inputFileName)

      // Time slicing if specified
      if (options.startTime !== undefined) {
        args.push('-ss', options.startTime.toString())
      }
      if (options.endTime !== undefined) {
        // Use -t (duration) instead of -to for better compatibility
        const duration = options.endTime - (options.startTime || 0)
        args.push('-t', duration.toString())
      }

      // Check if we need any filters
      const needsReencoding = !!(options.cropRect || options.filter || options.textOverlay)
      const filterComplex: string[] = []

      if (options.cropRect) {
        const { x, y, width, height } = options.cropRect
        filterComplex.push(`crop=${width}:${height}:${x}:${y}`)
      }

      if (options.filter) {
        filterComplex.push(options.filter)
      }

      if (options.textOverlay) {
        const { text, fontSize = 24, color = 'white', fontFamily = 'Arial' } = options.textOverlay
        // Basic text overlay - position can be refined based on requirements
        filterComplex.push(
          `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${color}:fontfile=${fontFamily}:x=10:y=10`,
        )
      }

      // Add filter complex if we have any filters
      if (filterComplex.length > 0) {
        args.push('-vf', filterComplex.join(','))
      }

      // Output settings
      if (!needsReencoding) {
        // If no filters are applied, use stream copy for faster processing
        args.push('-c', 'copy')
      }

      // Output file
      args.push('-y', outputFileName)

      // Execute FFmpeg command
      await instance.exec(args)

      // Read the output file
      const outputData = await instance.readFile(outputFileName)

      // Clean up files from virtual filesystem
      await instance.deleteFile(inputFileName)
      await instance.deleteFile(outputFileName)

      // Create and return output blob
      // Handle both Uint8Array and string cases
      let blobData: ArrayBuffer | string = outputData
      if (outputData instanceof Uint8Array) {
        blobData = outputData.buffer
      }

      const outputBlob = new Blob([blobData], {
        type: options.inputFile.type || 'video/mp4',
      })
      return outputBlob
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to process video')
      console.error('Video processing failed:', error)
      throw error
    } finally {
      editorStore.setProcessingState(false)
    }
  }

  return {
    loadFFmpeg,
    getFFmpeg,
    performEdit,
    error,
  }
}
