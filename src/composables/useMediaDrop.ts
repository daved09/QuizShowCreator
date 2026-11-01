import { ref } from 'vue'
import { fileToAudioDataUrl, isAudioFile } from '@/utils/audio'
import { fileToImageDataUrl, isImageFile } from '@/utils/image'

type MediaDraft = { image: string; audio: string }

const hasFiles = (dataTransfer: DataTransfer | null): boolean =>
  !!dataTransfer && Array.from(dataTransfer.types).includes('Files')

// Drag & drop and paste of an image or audio file into a text field. Files are
// read as data URLs into `draft.image` / `draft.audio`; read errors end up in
// `imageError` / `audioError`.
export const useMediaDrop = (draft: MediaDraft) => {
  const imageError = ref('')
  const audioError = ref('')
  const isDragging = ref(false)

  const setImageFromFile = async (file: File): Promise<void> => {
    imageError.value = ''
    try {
      draft.image = await fileToImageDataUrl(file)
    } catch (err) {
      imageError.value = err instanceof Error ? err.message : 'Bild konnte nicht geladen werden.'
    }
  }

  const setAudioFromFile = async (file: File): Promise<void> => {
    audioError.value = ''
    try {
      draft.audio = await fileToAudioDataUrl(file)
    } catch (err) {
      audioError.value =
        err instanceof Error ? err.message : 'Audiodatei konnte nicht geladen werden.'
    }
  }

  // Routes a dropped/pasted file to image or audio based on its type.
  const applyFile = (file: File): void => {
    if (isImageFile(file)) {
      void setImageFromFile(file)
    } else if (isAudioFile(file)) {
      void setAudioFromFile(file)
    } else {
      imageError.value = 'Bitte eine Bild- oder Audiodatei auswählen.'
    }
  }

  const onDragOver = (event: DragEvent): void => {
    // Only intercept file drags; normal text drag & drop in the field stays possible.
    if (hasFiles(event.dataTransfer)) {
      event.preventDefault()
      isDragging.value = true
    }
  }

  const onDragLeave = (): void => {
    isDragging.value = false
  }

  const onDrop = (event: DragEvent): void => {
    isDragging.value = false
    const files = event.dataTransfer?.files
    if (!files || files.length === 0) return
    event.preventDefault()
    applyFile(files[0])
  }

  const onPaste = (event: ClipboardEvent): void => {
    const items = event.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (
        item.kind === 'file' &&
        (item.type.startsWith('image/') || item.type.startsWith('audio/'))
      ) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          applyFile(file)
          return
        }
      }
    }
  }

  const removeImage = (): void => {
    draft.image = ''
    imageError.value = ''
  }

  const removeAudio = (): void => {
    draft.audio = ''
    audioError.value = ''
  }

  return {
    imageError,
    audioError,
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
    onPaste,
    removeImage,
    removeAudio,
  }
}
