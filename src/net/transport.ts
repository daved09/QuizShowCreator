// Thin wrapper around PeerJS that hides the raw peer/connection plumbing.
//
// Host:  opens a peer whose id is derived from a short room code and accepts
//        incoming data connections. It can broadcast to every viewer.
// Client: creates an anonymous peer and connects to the host's room code.
//
// Only signalling goes through PeerJS' public cloud server; the actual game
// data flows over a WebRTC data channel (relayed via TURN when needed).

import Peer, { type DataConnection } from 'peerjs'

const ID_PREFIX = 'quizshow-'
// Ambiguous characters (0/O, 1/I) are left out to keep codes easy to read out.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export type TransportHandlers = {
	// The peer is ready (host: room is live, client: connected to host).
	onOpen: () => void
	// Incoming, already JSON-safe payload.
	onData: (data: unknown, peerId: string) => void
	// Host only: a viewer connected/disconnected.
	onViewerJoin?: (peerId: string) => void
	onViewerLeave?: (peerId: string) => void
	// Connection dropped or was closed remotely.
	onClose?: () => void
	onError?: (message: string) => void
}

export type Transport = {
	send: (data: unknown) => void
	broadcast: (data: unknown) => void
	close: () => void
}

export const generateRoomCode = (): string => {
	const bytes = new Uint8Array(CODE_LENGTH)
	crypto.getRandomValues(bytes)
	let code = ''
	for (let i = 0; i < CODE_LENGTH; i++) {
		code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
	}
	return code
}

export const roomIdFromCode = (code: string): string =>
	`${ID_PREFIX}${code.trim().toUpperCase()}`

const describeError = (error: unknown): string => {
	const type = (error as { type?: unknown }).type
	switch (type) {
		case 'unavailable-id':
			return 'Dieser Raumcode ist bereits belegt. Bitte erneut versuchen.'
		case 'peer-unavailable':
			return 'Kein Host mit diesem Raumcode gefunden.'
		case 'network':
		case 'server-error':
		case 'socket-error':
		case 'socket-closed':
			return 'Keine Verbindung zum Vermittlungsserver möglich.'
		case 'browser-incompatible':
			return 'Dieser Browser unterstützt keine Peer-Verbindungen.'
		case 'webrtc':
			return 'WebRTC-Verbindung fehlgeschlagen.'
		default:
			return (error as Error)?.message || 'Unbekannter Netzwerkfehler.'
	}
}

export const createHostTransport = (
	code: string,
	handlers: TransportHandlers,
): Transport => {
	const peer = new Peer(roomIdFromCode(code))
	const connections = new Set<DataConnection>()

	peer.on('open', () => handlers.onOpen())

	peer.on('connection', (connection: DataConnection) => {
		connections.add(connection)
		// Fire on open (not on connect) so the initial state broadcast can reach it.
		connection.on('open', () => handlers.onViewerJoin?.(connection.peer))
		connection.on('data', (data: unknown) => handlers.onData(data, connection.peer))
		connection.on('close', () => {
			connections.delete(connection)
			handlers.onViewerLeave?.(connection.peer)
		})
		connection.on('error', (error: unknown) =>
			handlers.onError?.(describeError(error)),
		)
	})

	peer.on('error', (error: unknown) => handlers.onError?.(describeError(error)))
	peer.on('disconnected', () => handlers.onClose?.())

	return {
		send: (data: unknown) => {
			for (const connection of connections) {
				if (connection.open) connection.send(data)
			}
		},
		broadcast: (data: unknown) => {
			for (const connection of connections) {
				if (connection.open) connection.send(data)
			}
		},
		close: () => {
			for (const connection of connections) connection.close()
			connections.clear()
			peer.destroy()
		},
	}
}

export const createClientTransport = (
	code: string,
	handlers: TransportHandlers,
): Transport => {
	const peer = new Peer()
	let connection: DataConnection | null = null

	peer.on('open', () => {
		connection = peer.connect(roomIdFromCode(code), { reliable: true })
		connection.on('open', () => handlers.onOpen())
		connection.on('data', (data: unknown) => handlers.onData(data, connection?.peer ?? ''))
		connection.on('close', () => handlers.onClose?.())
		connection.on('error', (error: unknown) => handlers.onError?.(describeError(error)))
	})

	peer.on('error', (error: unknown) => handlers.onError?.(describeError(error)))
	peer.on('disconnected', () => handlers.onClose?.())

	return {
		send: (data: unknown) => {
			if (connection?.open) connection.send(data)
		},
		// A client has exactly one connection, so broadcast behaves like send.
		broadcast: (data: unknown) => {
			if (connection?.open) connection.send(data)
		},
		close: () => {
			connection?.close()
			peer.destroy()
		},
	}
}
