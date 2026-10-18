// Hilfsfunktionen zum Einlesen von Audiodateien für Fragen.
// Audio wird wie Bilder als Base64-Data-URL gespeichert, damit das Quiz-JSON eigenständig bleibt.

// Maximale Dateigröße; größere Dateien werden aus Speicher-/Exportgründen abgelehnt.
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024

export const isAudioFile = (file: File): boolean => file.type.startsWith('audio/')

const readAsDataURL = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () =>
			reject(reader.error ?? new Error('Audiodatei konnte nicht gelesen werden.'))
		reader.readAsDataURL(file)
	})

// Liest eine Audiodatei ein und gibt sie als Base64-Data-URL zurück.
export const fileToAudioDataUrl = async (file: File): Promise<string> => {
	if (!isAudioFile(file)) {
		throw new Error('Bitte eine Audiodatei auswählen.')
	}
	if (file.size > MAX_AUDIO_BYTES) {
		throw new Error('Die Audiodatei ist zu groß (max. 10 MB).')
	}
	return readAsDataURL(file)
}
