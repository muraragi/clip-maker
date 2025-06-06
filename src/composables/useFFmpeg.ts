import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { useEditorStore } from '@/stores/editor'
import type { CropRect, TextOverlay, TimelineSegment } from '@/stores/editor'
import { toast } from 'vue-sonner'

let ffmpeg: FFmpeg | null = null

export function useFFmpeg() {
  const error = ref<Error | null>(null)
  const editorStore = useEditorStore()

  const loadFFmpeg = async () => {
    try {
      if (!ffmpeg) {
        ffmpeg = new FFmpeg()

        const baseURL = '/api/cors'

        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        })

        ffmpeg.on('progress', ({ progress }) => {
          editorStore.updateProgress(Math.round(progress * 100))
        })
      }

      editorStore.setFFmpegLoadingState(false)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to load FFmpeg')
      toast.error(`Failed to load FFmpeg: ${e}`)
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

      const inputFileName = 'input.mp4'
      const outputFileName = 'output.mp4'
      const tempSegmentPrefix = 'segment_'

      const sortedSegments = [...options.timelineSegments].sort((a, b) => a.start - b.start)

      if (sortedSegments.length === 0) {
        throw new Error('No timeline segments provided')
      }

      const inputData = await fetchFile(options.inputFile)
      await instance.writeFile(inputFileName, inputData)

      if (sortedSegments.length === 1) {
        const segment = sortedSegments[0]

        const args: string[] = []

        args.push('-i', inputFileName)

        args.push('-ss', segment.start.toString())

        const duration = segment.end - segment.start
        args.push('-t', duration.toString())

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
          filterComplex.push(
            `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${color}:fontfile=${fontFamily}:x=10:y=10`,
          )
        }

        if (filterComplex.length > 0) {
          args.push('-vf', filterComplex.join(','))
        }

        if (!needsReencoding && !sortedSegments.length) {
          args.push('-c', 'copy')
        }

        args.push('-y', outputFileName)

        await instance.exec(args)
      } else {
        const segmentFiles: string[] = []
        const concatFileContent: string[] = []

        for (let i = 0; i < sortedSegments.length; i++) {
          const segment = sortedSegments[i]
          const segmentFileName = `${tempSegmentPrefix}${i}.mp4`
          segmentFiles.push(segmentFileName)

          const segmentArgs: string[] = [
            '-i',
            inputFileName,
            '-ss',
            segment.start.toString(),
            '-t',
            (segment.end - segment.start).toString(),
            '-c',
            '-y',
            segmentFileName,
          ]

          await instance.exec(segmentArgs)

          concatFileContent.push(`file ${segmentFileName}`)
        }

        const concatFileName = 'concat.txt'
        await instance.writeFile(concatFileName, concatFileContent.join('\n'))

        const needsReencoding = !!(options.cropRect || options.filter || options.textOverlay)

        if (needsReencoding) {
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

          await instance.exec([
            '-i',
            'temp_concat.mp4',
            '-vf',
            filterComplex.join(','),
            '-y',
            outputFileName,
          ])

          await instance.deleteFile('temp_concat.mp4')
        } else {
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

        await instance.deleteFile(concatFileName)
        for (const segmentFile of segmentFiles) {
          await instance.deleteFile(segmentFile)
        }
      }

      const outputData = await instance.readFile(outputFileName)

      await instance.deleteFile(inputFileName)
      await instance.deleteFile(outputFileName)

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
      toast.error(`Failed to process video: ${error.message}`)
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
