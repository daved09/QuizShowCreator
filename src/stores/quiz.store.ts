import { ref } from 'vue'
import { defineStore } from 'pinia'

export const DEFAULT_POINTS = [100, 200, 300, 400, 500]

export type Theme = {
	id: string;
	themeText: string;
	questions: Question[];
}

export type Question = {
	points: number;
	question: string;
	answer: string;
	// Optional question image as a Base64 data URL (e.g. "data:image/png;base64,...").
	image?: string;
	// Optional question audio as a Base64 data URL (e.g. "data:audio/mpeg;base64,...").
	audio?: string;
}

export type Player = {
	id: string;
	name: string;
	score: number;
}

export const QUIZ_FILE_VERSION = 4;

export type QuizFile = {
	app: 'QuizShowCreator';
	version: number;
	themes: Theme[];
	players: Player[];
}

export type ImportResult = { ok: true } | { ok: false; error: string };

const createTheme = (themeText: string): Theme => {
	return {
		id: crypto.randomUUID(),
		themeText,
		questions: DEFAULT_POINTS.map(points => ({ points, question: "", answer: "" })),
	};
};

const cardKey = (themeId: string, points: number): string => `${themeId}:${points}`;

export const useQuizStore = defineStore('quizshow', () => {

	const themes = ref<Theme[]>([]);

	const players = ref<Player[]>([]);

	// Runtime state: which card has already been answered (key -> player name).
	const answeredBy = ref<Map<string, string>>(new Map());

	const isEditMode = ref<boolean>(true);

	const setEditMode = (value: boolean) => {
		isEditMode.value = value;
	};

	const toggleEditMode = () => {
		isEditMode.value = !isEditMode.value;
	};

	const addColumn = () => {
		themes.value.push(createTheme("New Theme"));
	};

	const removeTheme = (id: string) => {
		themes.value = themes.value.filter(t => t.id !== id);
	};

	const updateThemeText = (id: string, themeText: string) => {
		const theme = themes.value.find(t => t.id === id);
		if (theme) {
			theme.themeText = themeText;
		}
	};

	const updateQuestion = (themeId: string, points: number, question: string) => {
		const theme = themes.value.find(t => t.id === themeId);
		if (!theme) return;
		const existing = theme.questions.find(q => q.points === points);
		if (existing) {
			existing.question = question;
		} else {
			theme.questions.push({ points, question, answer: "" });
		}
	};

	const updateQuestionFull = (themeId: string, oldPoints: number, data: { points: number; question: string; answer: string; image?: string; audio?: string }): boolean => {
		const theme = themes.value.find(t => t.id === themeId);
		if (!theme) return false;
		const target = theme.questions.find(q => q.points === oldPoints);
		if (!target) return false;
		if (!Number.isInteger(data.points)) return false;
		if (data.points !== oldPoints && theme.questions.some(q => q.points === data.points)) {
			return false;
		}
		target.points = data.points;
		target.question = data.question;
		target.answer = data.answer;
		target.image = data.image ? data.image : undefined;
		target.audio = data.audio ? data.audio : undefined;
		theme.questions.sort((a, b) => a.points - b.points);
		return true;
	};

	const addPlayer = (name?: string) => {
		const trimmed = (name ?? "").trim();
		players.value.push({
			id: crypto.randomUUID(),
			name: trimmed || `Spieler ${players.value.length + 1}`,
			score: 0,
		});
	};

	const removePlayer = (id: string) => {
		players.value = players.value.filter(p => p.id !== id);
	};

	const renamePlayer = (id: string, name: string) => {
		const player = players.value.find(p => p.id === id);
		if (player) {
			player.name = name.trim() || player.name;
		}
	};

	const awardPointsForCard = (playerId: string, themeId: string, cardPoints: number): boolean => {
		const player = players.value.find(p => p.id === playerId);
		if (!player) return false;
		player.score += cardPoints;
		answeredBy.value.set(cardKey(themeId, cardPoints), player.name);
		return true;
	};

	const isAnswered = (themeId: string, points: number): boolean => {
		return answeredBy.value.has(cardKey(themeId, points));
	};

	const getAnsweredBy = (themeId: string, points: number): string | null => {
		return answeredBy.value.get(cardKey(themeId, points)) ?? null;
	};

	const resetRound = () => {
		players.value.forEach(p => {
			p.score = 0;
		});
		answeredBy.value = new Map();
	};

	const exportQuiz = (): QuizFile => {
		return {
			app: 'QuizShowCreator',
			version: QUIZ_FILE_VERSION,
			themes: themes.value,
			players: players.value,
		};
	};

	const importQuiz = (data: unknown): ImportResult => {
		if (typeof data !== 'object' || data === null) {
			return { ok: false, error: 'Ungültiges Dateiformat.' };
		}
		const rawThemes = (data as { themes?: unknown }).themes;
		if (!Array.isArray(rawThemes)) {
			return { ok: false, error: 'Keine Themen in der Datei gefunden.' };
		}
		const parsed: Theme[] = [];
		for (const rawTheme of rawThemes) {
			if (typeof rawTheme !== 'object' || rawTheme === null) {
				return { ok: false, error: 'Ungültiges Thema in der Datei.' };
			}
			const themeText = (rawTheme as { themeText?: unknown }).themeText;
			if (typeof themeText !== 'string') {
				return { ok: false, error: 'Ein Thema hat keinen gültigen Namen.' };
			}
			const rawQuestions = (rawTheme as { questions?: unknown }).questions;
			if (!Array.isArray(rawQuestions)) {
				return { ok: false, error: 'Ein Thema enthält keine gültigen Fragen.' };
			}
			const questions: Question[] = [];
			for (const rawQuestion of rawQuestions) {
				if (typeof rawQuestion !== 'object' || rawQuestion === null) {
					return { ok: false, error: 'Ungültige Frage in der Datei.' };
				}
				const { points, question, answer, image, audio } = rawQuestion as Record<string, unknown>;
				if (typeof points !== 'number' || !Number.isFinite(points)) {
					return { ok: false, error: 'Eine Frage hat eine ungültige Punktzahl.' };
				}
				if (typeof question !== 'string' || typeof answer !== 'string') {
					return { ok: false, error: 'Eine Frage hat ungültigen Text.' };
				}
				// Image is optional (older files without an image stay readable).
				const parsedImage =
					typeof image === 'string' && image.startsWith('data:image/') ? image : undefined;
				// Audio is optional (older files without audio stay readable).
				const parsedAudio =
					typeof audio === 'string' && audio.startsWith('data:audio/') ? audio : undefined;
				questions.push({ points, question, answer, image: parsedImage, audio: parsedAudio });
			}
			questions.sort((a, b) => a.points - b.points);
			parsed.push({ id: crypto.randomUUID(), themeText, questions });
		}

		// Players are optional (older files without players stay readable).
		const rawPlayers = (data as { players?: unknown }).players;
		const parsedPlayers: Player[] = [];
		if (rawPlayers !== undefined) {
			if (!Array.isArray(rawPlayers)) {
				return { ok: false, error: 'Ungültige Spielerliste in der Datei.' };
			}
			for (const rawPlayer of rawPlayers) {
				if (typeof rawPlayer !== 'object' || rawPlayer === null) {
					return { ok: false, error: 'Ein Spieler in der Datei ist ungültig.' };
				}
				const { name, score } = rawPlayer as Record<string, unknown>;
				if (typeof name !== 'string') {
					return { ok: false, error: 'Ein Spieler hat keinen gültigen Namen.' };
				}
				const playerScore = typeof score === 'number' && Number.isFinite(score) ? score : 0;
				parsedPlayers.push({ id: crypto.randomUUID(), name, score: playerScore });
			}
		}

		themes.value = parsed;
		players.value = parsedPlayers;
		answeredBy.value = new Map();
		return { ok: true };
	};

	return {
		addColumn,
		removeTheme,
		updateThemeText,
		updateQuestion,
		updateQuestionFull,
		addPlayer,
		removePlayer,
		renamePlayer,
		awardPointsForCard,
		isAnswered,
		getAnsweredBy,
		resetRound,
		exportQuiz,
		importQuiz,
		themes,
		players,
		isEditMode,
		setEditMode,
		toggleEditMode,
	}
})
