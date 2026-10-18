import { afterEach, vi } from 'vitest'

// jsdom implementiert weder alert noch confirm. Für Tests deterministisch stubbn,
// damit z. B. Löschdialoge standardmäßig bestätigt werden.
vi.stubGlobal('alert', vi.fn())
vi.stubGlobal('confirm', vi.fn(() => true))

// jsdom stellt in manchen Versionen kein crypto.randomUUID bereit, der Store nutzt es
// aber beim Anlegen von Themen, Spielern und beim Import.
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  let counter = 0
  const cryptoObj = globalThis.crypto ?? ((globalThis as Record<string, unknown>).crypto = {})
  Object.defineProperty(cryptoObj, 'randomUUID', {
    configurable: true,
    value: () =>
      `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
  })
}

// Vue Test Utils hängt gemountete Komponenten an document.body; zwischen Tests aufräumen.
afterEach(() => {
  document.body.innerHTML = ''
})
