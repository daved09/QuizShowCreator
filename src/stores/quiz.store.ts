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
}

export const QUIZ_FILE_VERSION = 1;

export type QuizFile = {
	app: 'QuizShowCreator';
	version: number;
	themes: Theme[];
}

export type ImportResult = { ok: true } | { ok: false; error: string };

const createTheme = (themeText: string): Theme => {
	return {
		id: crypto.randomUUID(),
		themeText,
		questions: DEFAULT_POINTS.map(points => ({ points, question: "", answer: "" })),
	};
};

export const useQuizStore = defineStore('quizshow', () => {

	const themes = ref<Theme[]>([]);

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

	const updateQuestionFull = (themeId: string, oldPoints: number, data: { points: number; question: string; answer: string }): boolean => {
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
		theme.questions.sort((a, b) => a.points - b.points);
		return true;
	};

	const exportQuiz = (): QuizFile => {
		return {
			app: 'QuizShowCreator',
			version: QUIZ_FILE_VERSION,
			themes: themes.value,
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
				const { points, question, answer } = rawQuestion as Record<string, unknown>;
				if (typeof points !== 'number' || !Number.isFinite(points)) {
					return { ok: false, error: 'Eine Frage hat eine ungültige Punktzahl.' };
				}
				if (typeof question !== 'string' || typeof answer !== 'string') {
					return { ok: false, error: 'Eine Frage hat ungültigen Text.' };
				}
				questions.push({ points, question, answer });
			}
			questions.sort((a, b) => a.points - b.points);
			parsed.push({ id: crypto.randomUUID(), themeText, questions });
		}
		themes.value = parsed;
		return { ok: true };
	};

	return { addColumn, removeTheme, updateThemeText, updateQuestion, updateQuestionFull, exportQuiz, importQuiz, themes, isEditMode, setEditMode, toggleEditMode }
})