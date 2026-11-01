import { afterEach, vi } from 'vitest'

// jsdom implements neither alert nor confirm. Stub them deterministically for tests
// so that e.g. delete dialogs are confirmed by default.
vi.stubGlobal('alert', vi.fn())
vi.stubGlobal(
  'confirm',
  vi.fn(() => true),
)

// Some jsdom versions do not provide crypto.randomUUID, but the store uses it
// when creating themes and players and when importing.
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  let counter = 0
  const cryptoObj = globalThis.crypto ?? ((globalThis as Record<string, unknown>).crypto = {})
  Object.defineProperty(cryptoObj, 'randomUUID', {
    configurable: true,
    value: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
  })
}

// Vue Test Utils attaches mounted components to document.body; clean up between tests.
afterEach(() => {
  document.body.innerHTML = ''
})
