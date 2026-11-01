// Domain types shared by the stores, the components and the wire protocol.

export type Question = {
  points: number
  question: string
  answer: string
  // Optional question image as a Base64 data URL (e.g. "data:image/png;base64,...").
  image?: string
  // Optional question audio as a Base64 data URL (e.g. "data:audio/mpeg;base64,...").
  audio?: string
}

export type Theme = {
  id: string
  themeText: string
  questions: Question[]
}

export type Player = {
  id: string
  name: string
  score: number
}

// Identifies a single card on the board.
export type OpenCard = {
  themeId: string
  points: number
}
