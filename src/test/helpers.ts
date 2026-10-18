import { createPinia, setActivePinia, type Pinia } from 'pinia'

// Erzeugt eine frische Pinia-Instanz, aktiviert sie für direkte Store-Aufrufe
// außerhalb von Komponenten und gibt sie für `global.plugins` beim Mounten zurück.
export const createTestPinia = (): Pinia => {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}
