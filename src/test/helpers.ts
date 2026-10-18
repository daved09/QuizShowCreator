import { createPinia, setActivePinia, type Pinia } from 'pinia'

// Creates a fresh Pinia instance, activates it for direct store calls
// outside of components, and returns it for `global.plugins` when mounting.
export const createTestPinia = (): Pinia => {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}
