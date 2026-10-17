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

function createTheme(themeText: string): Theme {
	return {
		id: crypto.randomUUID(),
		themeText,
		questions: DEFAULT_POINTS.map(points => ({ points, question: "", answer: "" })),
	};
}

export const useQuizStore = defineStore('quizshow', () => {

	const themes = ref<Theme[]>([
		createTheme("Test"),
		createTheme("Test2"),
	]);

	const isEditMode = ref<boolean>(false);

	function setEditMode(value: boolean) {
		isEditMode.value = value;
	}

	function toggleEditMode() {
		isEditMode.value = !isEditMode.value;
	}
  
	function addColumn() {
		themes.value.push(createTheme("New Theme"));
	}

	function removeTheme(id: string) {
		themes.value = themes.value.filter(t => t.id !== id);
	}

	function updateThemeText(id: string, themeText: string) {
		const theme = themes.value.find(t => t.id === id);
		if (theme) {
			theme.themeText = themeText;
		}
	}

	function updateQuestion(themeId: string, points: number, question: string) {
		const theme = themes.value.find(t => t.id === themeId);
		if (!theme) return;
		const existing = theme.questions.find(q => q.points === points);
		if (existing) {
			existing.question = question;
		} else {
			theme.questions.push({ points, question, answer: "" });
		}
	}

	function updateQuestionFull(themeId: string, oldPoints: number, data: { points: number; question: string; answer: string }): boolean {
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
	}

	return { addColumn, removeTheme, updateThemeText, updateQuestion, updateQuestionFull, themes, isEditMode, setEditMode, toggleEditMode }
})