import { MAX_PLAYER_NAME_LENGTH } from '@/constants'

// Trims a player name and cuts it to the allowed length.
export const normalizePlayerName = (name: string | undefined): string =>
  (name ?? '').trim().slice(0, MAX_PLAYER_NAME_LENGTH)
