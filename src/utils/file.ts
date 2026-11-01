// Reads a file as a Base64 data URL; `errorMessage` is used when the browser reports no error.
export const readFileAsDataUrl = (file: File, errorMessage: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error(errorMessage))
    reader.readAsDataURL(file)
  })
