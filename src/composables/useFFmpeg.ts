import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { useEditorStore } from '@/stores/editor'
import type { CropRect, TextOverlay, TimelineSegment } from '@/stores/editor'

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
    timelineSegments: TimelineSegment[]
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
      const tempSegmentPrefix = 'segment_'

      // Sort segments by start time
      const sortedSegments = [...options.timelineSegments].sort((a, b) => a.start - b.start)

      if (sortedSegments.length === 0) {
        throw new Error('No timeline segments provided')
      }

      // Convert input to FFmpeg-compatible format and write to virtual filesystem
      const inputData = await fetchFile(options.inputFile)
      await instance.writeFile(inputFileName, inputData)

      // If we have only one segment, we can process it directly
      if (sortedSegments.length === 1) {
        const segment = sortedSegments[0]

        // Construct FFmpeg command arguments
        const args: string[] = []

        // Input file
        args.push('-i', inputFileName)

        // Time slicing
        args.push('-ss', segment.start.toString())

        // Use -t (duration) instead of -to for better compatibility
        const duration = segment.end - segment.start
        args.push('-t', duration.toString())

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
        if (!needsReencoding && !sortedSegments.length) {
          // If no filters are applied and no segments, use stream copy for faster processing
          args.push('-c', 'copy')
        }

        // Output file
        args.push('-y', outputFileName)

        // Execute FFmpeg command
        await instance.exec(args)
      } else {
        // For multiple segments, we need to:
        // 1. Extract each segment to a separate file
        // 2. Create a concat file listing all segments
        // 3. Use the concat demuxer to join them

        const segmentFiles: string[] = []
        const concatFileContent: string[] = []

        // Process each segment
        for (let i = 0; i < sortedSegments.length; i++) {
          const segment = sortedSegments[i]
          const segmentFileName = `${tempSegmentPrefix}${i}.mp4`
          segmentFiles.push(segmentFileName)

          // Create segment extraction command
          const segmentArgs: string[] = [
            '-i',
            inputFileName,
            '-ss',
            segment.start.toString(),
            '-t',
            (segment.end - segment.start).toString(),
            '-c',
            'copy', // Use copy for faster segment extraction
            '-y',
            segmentFileName,
          ]

          // Extract segment
          await instance.exec(segmentArgs)

          // Add to concat file
          concatFileContent.push(`file ${segmentFileName}`)
        }

        // Write concat file
        const concatFileName = 'concat.txt'
        await instance.writeFile(concatFileName, concatFileContent.join('\n'))

        // Apply filters if needed
        const needsReencoding = !!(options.cropRect || options.filter || options.textOverlay)

        if (needsReencoding) {
          // If we need filters, first concatenate segments
          await instance.exec([
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            concatFileName,
            '-c',
            'copy',
            '-y',
            'temp_concat.mp4',
          ])

          // Then apply filters
          const filterComplex: string[] = []

          if (options.cropRect) {
            const { x, y, width, height } = options.cropRect
            filterComplex.push(`crop=${width}:${height}:${x}:${y}`)
          }

          if (options.filter) {
            filterComplex.push(options.filter)
          }

          if (options.textOverlay) {
            const {
              text,
              fontSize = 24,
              color = 'white',
              fontFamily = 'Arial',
            } = options.textOverlay
            filterComplex.push(
              `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${color}:fontfile=${fontFamily}:x=10:y=10`,
            )
          }

          // Apply filters to concatenated file
          await instance.exec([
            '-i',
            'temp_concat.mp4',
            '-vf',
            filterComplex.join(','),
            '-y',
            outputFileName,
          ])

          // Clean up temporary concatenated file
          await instance.deleteFile('temp_concat.mp4')
        } else {
          // No filters, just concatenate directly to output
          await instance.exec([
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            concatFileName,
            '-c',
            'copy',
            '-y',
            outputFileName,
          ])
        }

        // Clean up segment files and concat file
        await instance.deleteFile(concatFileName)
        for (const segmentFile of segmentFiles) {
          await instance.deleteFile(segmentFile)
        }
      }

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
