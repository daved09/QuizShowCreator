// Point values of the cards in a newly added theme column.
export const DEFAULT_POINTS = [100, 200, 300, 400, 500]
export const MAX_THEME_COLUMNS = 6

// Input limits, shared by the inputs and the stores.
export const MAX_PLAYER_NAME_LENGTH = 10
export const MAX_THEME_NAME_LENGTH = 15
export const MAX_QUESTION_LENGTH = 500
export const MAX_ANSWER_LENGTH = 250
export const MIN_CHOICES = 2
export const MAX_CHOICES = 6
export const MAX_CHOICE_LENGTH = 100

// Network limits (multiplayer). Protect host and viewers from oversized or
// flooding peers; generous enough that regular quizzes never hit them.
export const MAX_VIEWERS = 30
export const MAX_NET_ID_LENGTH = 100
export const MAX_NET_TEXT_LENGTH = 2000
export const MAX_NET_THEMES = 50
export const MAX_NET_QUESTIONS_PER_THEME = 50
export const MAX_NET_PLAYERS = 200
// Media travels as Base64 data URLs: audio is capped at 10 MB (~14 M chars),
// images are downscaled before saving and stay far below this.
export const MAX_NET_IMAGE_LENGTH = 8 * 1024 * 1024
export const MAX_NET_AUDIO_LENGTH = 15 * 1024 * 1024
