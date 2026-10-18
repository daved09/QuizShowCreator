// Hilfsfunktionen zum Einlesen und Verkleinern von Bildern für Fragen.
// Bilder werden als Base64-Data-URLs gespeichert, damit das Quiz-JSON eigenständig bleibt.

// Maximale Kantenlänge; größere Bilder werden vor dem Speichern verkleinert.
const MAX_EDGE = 1280

export const isImageFile = (file: File): boolean => file.type.startsWith('image/')

const readAsDataURL = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () =>
			reject(reader.error ?? new Error('Bild konnte nicht gelesen werden.'))
		reader.readAsDataURL(file)
	})

const loadImage = (src: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
		img.src = src
	})

// Liest eine Bilddatei ein und verkleinert sie bei Bedarf auf MAX_EDGE.
export const fileToImageDataUrl = async (file: File): Promise<string> => {
	if (!isImageFile(file)) {
		throw new Error('Bitte eine Bilddatei auswählen.')
	}
	const dataUrl = await readAsDataURL(file)
	const img = await loadImage(dataUrl)

	const longestEdge = Math.max(img.width, img.height)
	if (longestEdge <= MAX_EDGE) {
		return dataUrl
	}

	const scale = MAX_EDGE / longestEdge
	const width = Math.round(img.width * scale)
	const height = Math.round(img.height * scale)

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	if (!ctx) {
		return dataUrl
	}
	ctx.drawImage(img, 0, 0, width, height)

	// PNG behält Transparenz; alles andere wird als JPEG gespeichert.
	const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
	return canvas.toDataURL(type, 0.85)
}
