// Single place for the native browser dialogs, so they can later be replaced
// by in-app dialogs without touching every caller.

export const showError = (message: string): void => {
  window.alert(message)
}

export const confirmAction = (message: string): boolean => window.confirm(message)
