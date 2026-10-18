// Helpers for reading and downscaling images for questions.
// Images are stored as Base64 data URLs so the quiz JSON stays self-contained.

// Maximum edge length; larger images are downscaled before saving.
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

// Reads an image file and downscales it to MAX_EDGE if needed.
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

	// PNG keeps transparency; everything else is saved as JPEG.
	const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
	return canvas.toDataURL(type, 0.85)
}
