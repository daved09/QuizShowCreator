// Helpers for reading audio files for questions.
// Audio is stored as a Base64 data URL (like images) so the quiz JSON stays self-contained.

import { readFileAsDataUrl } from '@/utils/file'

// Maximum file size; larger files are rejected for storage/export reasons.
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024

export const isAudioFile = (file: File): boolean => file.type.startsWith('audio/')

// Reads an audio file and returns it as a Base64 data URL.
export const fileToAudioDataUrl = async (file: File): Promise<string> => {
  if (!isAudioFile(file)) {
    throw new Error('Bitte eine Audiodatei auswählen.')
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error('Die Audiodatei ist zu groß (max. 10 MB).')
  }
  return readFileAsDataUrl(file, 'Audiodatei konnte nicht gelesen werden.')
}
