import { beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (...args: unknown[]) => void

const { FakePeer, FakeConnection } = vi.hoisted(() => {
  class FakeConnection {
    peer = 'viewer-1'
    open = true
    sent: unknown[] = []
    private handlers: Record<string, Handler[]> = {}

    on(event: string, cb: Handler): FakeConnection {
      ;(this.handlers[event] ??= []).push(cb)
      return this
    }
    emit(event: string, ...args: unknown[]): void {
      for (const cb of this.handlers[event] ?? []) cb(...args)
    }
    send(data: unknown): void {
      this.sent.push(data)
    }
    close = vi.fn()
  }

  class FakePeer {
    static instances: FakePeer[] = []
    id?: string
    connectedTo?: string
    lastConnection?: FakeConnection
    destroyed = false
    private handlers: Record<string, Handler[]> = {}

    constructor(id?: string) {
      this.id = id
      FakePeer.instances.push(this)
    }

    on(event: string, cb: Handler): FakePeer {
      ;(this.handlers[event] ??= []).push(cb)
      return this
    }
    emit(event: string, ...args: unknown[]): void {
      for (const cb of this.handlers[event] ?? []) cb(...args)
    }
    connect(id: string): FakeConnection {
      this.connectedTo = id
      this.lastConnection = new FakeConnection()
      return this.lastConnection
    }
    destroy(): void {
      this.destroyed = true
    }
  }

  return { FakePeer, FakeConnection }
})

vi.mock('peerjs', () => ({ default: FakePeer }))

import { MAX_VIEWERS } from '@/constants'
import {
  createClientTransport,
  createHostTransport,
  generateRoomCode,
  roomIdFromCode,
} from '@/net/transport'

describe('room codes', () => {
  it('generates an 8 character code from the safe alphabet', () => {
    for (let i = 0; i < 25; i++) {
      const code = generateRoomCode()
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    }
  })

  it('derives a prefixed, upper-cased peer id', () => {
    expect(roomIdFromCode(' ab12cd ')).toBe('quizshow-AB12CD')
  })
})

describe('createHostTransport', () => {
  beforeEach(() => {
    FakePeer.instances = []
  })

  it('opens a peer with the room id and reports open', () => {
    const onOpen = vi.fn()
    createHostTransport('ab12cd', { onOpen, onData: vi.fn() })

    const peer = FakePeer.instances[0]
    expect(peer.id).toBe('quizshow-AB12CD')

    peer.emit('open')
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('announces viewers once their connection is open and broadcasts to them', () => {
    const onViewerJoin = vi.fn()
    const onViewerLeave = vi.fn()
    const transport = createHostTransport('code', {
      onOpen: vi.fn(),
      onData: vi.fn(),
      onViewerJoin,
      onViewerLeave,
    })
    const peer = FakePeer.instances[0]

    const connection = new FakeConnection()
    peer.emit('connection', connection)
    expect(onViewerJoin).not.toHaveBeenCalled()

    connection.emit('open')
    expect(onViewerJoin).toHaveBeenCalledWith('viewer-1')

    transport.broadcast({ type: 'state' })
    expect(connection.sent).toEqual([{ type: 'state' }])

    connection.emit('close')
    expect(onViewerLeave).toHaveBeenCalledWith('viewer-1')
  })

  it('refuses viewers beyond the room limit', () => {
    const onViewerJoin = vi.fn()
    createHostTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onViewerJoin })
    const peer = FakePeer.instances[0]
    for (let i = 0; i < MAX_VIEWERS; i++) peer.emit('connection', new FakeConnection())

    const extra = new FakeConnection()
    peer.emit('connection', extra)
    extra.emit('open')

    expect(extra.close).toHaveBeenCalled()
    expect(onViewerJoin).not.toHaveBeenCalled()
  })

  it('skips connections that are not open yet', () => {
    const transport = createHostTransport('code', { onOpen: vi.fn(), onData: vi.fn() })
    const peer = FakePeer.instances[0]
    const connection = new FakeConnection()
    connection.open = false
    peer.emit('connection', connection)

    transport.broadcast({ type: 'state' })
    expect(connection.sent).toEqual([])
  })

  it('maps peer errors to a friendly message', () => {
    const onError = vi.fn()
    createHostTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onError })
    FakePeer.instances[0].emit('error', { type: 'unavailable-id' })

    expect(onError).toHaveBeenCalledWith(
      'Dieser Raumcode ist bereits belegt. Bitte erneut versuchen.',
    )
  })

  it('destroys the peer and closes connections on close', () => {
    const transport = createHostTransport('code', { onOpen: vi.fn(), onData: vi.fn() })
    const peer = FakePeer.instances[0]
    const connection = new FakeConnection()
    peer.emit('connection', connection)

    transport.close()

    expect(connection.close).toHaveBeenCalled()
    expect(peer.destroyed).toBe(true)
  })
})

describe('createClientTransport', () => {
  beforeEach(() => {
    FakePeer.instances = []
  })

  it('connects to the host room and reports open', () => {
    const onOpen = vi.fn()
    createClientTransport('cd34ef', { onOpen, onData: vi.fn() })
    const peer = FakePeer.instances[0]

    peer.emit('open')
    expect(peer.connectedTo).toBe('quizshow-CD34EF')

    peer.lastConnection?.emit('open')
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('sends data over its single connection and forwards incoming data', () => {
    const onData = vi.fn()
    const transport = createClientTransport('code', { onOpen: vi.fn(), onData })
    const peer = FakePeer.instances[0]
    peer.emit('open')
    const connection = peer.lastConnection!

    transport.send({ type: 'hello' })
    expect(connection.sent).toEqual([{ type: 'hello' }])

    connection.emit('data', { type: 'state' })
    expect(onData).toHaveBeenCalledWith({ type: 'state' }, 'viewer-1')
  })

  it('reports a closed connection', () => {
    const onClose = vi.fn()
    createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onClose })
    const peer = FakePeer.instances[0]
    peer.emit('open')

    peer.lastConnection?.emit('close')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('error messages', () => {
  beforeEach(() => {
    FakePeer.instances = []
  })

  it.each([
    ['unavailable-id', 'Dieser Raumcode ist bereits belegt. Bitte erneut versuchen.'],
    ['peer-unavailable', 'Kein Host mit diesem Raumcode gefunden.'],
    ['network', 'Keine Verbindung zum Vermittlungsserver möglich.'],
    ['server-error', 'Keine Verbindung zum Vermittlungsserver möglich.'],
    ['socket-error', 'Keine Verbindung zum Vermittlungsserver möglich.'],
    ['socket-closed', 'Keine Verbindung zum Vermittlungsserver möglich.'],
    ['browser-incompatible', 'Dieser Browser unterstützt keine Peer-Verbindungen.'],
    ['webrtc', 'WebRTC-Verbindung fehlgeschlagen.'],
  ])('maps %s to a friendly message', (type, message) => {
    const onError = vi.fn()
    createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onError })

    FakePeer.instances[0].emit('error', { type })

    expect(onError).toHaveBeenCalledWith(message)
  })

  it('falls back to the error message for unknown types', () => {
    const onError = vi.fn()
    createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onError })

    FakePeer.instances[0].emit('error', new Error('Etwas ging schief'))

    expect(onError).toHaveBeenCalledWith('Etwas ging schief')
  })

  it('falls back to a generic message without any details', () => {
    const onError = vi.fn()
    createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onError })

    FakePeer.instances[0].emit('error', {})

    expect(onError).toHaveBeenCalledWith('Unbekannter Netzwerkfehler.')
  })

  it('ignores errors without an error handler', () => {
    createHostTransport('code', { onOpen: vi.fn(), onData: vi.fn() })
    const peer = FakePeer.instances[0]
    const connection = new FakeConnection()
    peer.emit('connection', connection)

    expect(() => peer.emit('error', { type: 'network' })).not.toThrow()
    expect(() => connection.emit('error', { type: 'webrtc' })).not.toThrow()
  })
})

describe('host transport events', () => {
  beforeEach(() => {
    FakePeer.instances = []
  })

  it('forwards viewer data with the sender peer id', () => {
    const onData = vi.fn()
    createHostTransport('code', { onOpen: vi.fn(), onData })
    const connection = new FakeConnection()
    FakePeer.instances[0].emit('connection', connection)

    connection.emit('data', { type: 'buzz' })

    expect(onData).toHaveBeenCalledWith({ type: 'buzz' }, 'viewer-1')
  })

  it('reports viewer connection errors', () => {
    const onError = vi.fn()
    createHostTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onError })
    const connection = new FakeConnection()
    FakePeer.instances[0].emit('connection', connection)

    connection.emit('error', { type: 'webrtc' })

    expect(onError).toHaveBeenCalledWith('WebRTC-Verbindung fehlgeschlagen.')
  })

  it('works without the optional viewer handlers', () => {
    createHostTransport('code', { onOpen: vi.fn(), onData: vi.fn() })
    const peer = FakePeer.instances[0]
    const connection = new FakeConnection()
    peer.emit('connection', connection)

    expect(() => connection.emit('open')).not.toThrow()
    expect(() => connection.emit('close')).not.toThrow()
    expect(() => peer.emit('disconnected')).not.toThrow()
  })

  it('reports a lost signalling server connection', () => {
    const onClose = vi.fn()
    createHostTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onClose })

    FakePeer.instances[0].emit('disconnected')

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('client transport events', () => {
  beforeEach(() => {
    FakePeer.instances = []
  })

  it('drops sends before the connection exists or while it is closed', () => {
    const transport = createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn() })
    const peer = FakePeer.instances[0]

    expect(() => transport.send({ type: 'hello' })).not.toThrow()

    peer.emit('open')
    const connection = peer.lastConnection!
    connection.open = false
    transport.send({ type: 'hello' })

    expect(connection.sent).toEqual([])
  })

  it('reports connection errors and a lost signalling server', () => {
    const onError = vi.fn()
    const onClose = vi.fn()
    createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn(), onError, onClose })
    const peer = FakePeer.instances[0]
    peer.emit('open')

    peer.lastConnection?.emit('error', { type: 'peer-unavailable' })
    peer.emit('disconnected')

    expect(onError).toHaveBeenCalledWith('Kein Host mit diesem Raumcode gefunden.')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('works without the optional handlers', () => {
    createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn() })
    const peer = FakePeer.instances[0]
    peer.emit('open')

    expect(() => peer.lastConnection?.emit('close')).not.toThrow()
    expect(() => peer.lastConnection?.emit('error', { type: 'network' })).not.toThrow()
    expect(() => peer.emit('error', { type: 'network' })).not.toThrow()
    expect(() => peer.emit('disconnected')).not.toThrow()
  })

  it('closes the connection and destroys the peer', () => {
    const transport = createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn() })
    const peer = FakePeer.instances[0]

    transport.close()
    expect(peer.destroyed).toBe(true)

    const second = createClientTransport('code', { onOpen: vi.fn(), onData: vi.fn() })
    const secondPeer = FakePeer.instances[1]
    secondPeer.emit('open')
    second.close()

    expect(secondPeer.lastConnection?.close).toHaveBeenCalled()
    expect(secondPeer.destroyed).toBe(true)
  })
})
