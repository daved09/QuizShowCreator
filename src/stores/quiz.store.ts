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
}

function createTheme(themeText: string): Theme {
	return {
		id: crypto.randomUUID(),
		themeText,
		questions: DEFAULT_POINTS.map(points => ({ points, question: "" })),
	};
}

export const useQuizStore = defineStore('quizshow', () => {

	const themes = ref<Theme[]>([
		createTheme("Test"),
		createTheme("Test2"),
	]);
  
	function addColumn(themeText: string) {
		themes.value.push(createTheme(themeText));
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
			theme.questions.push({ points, question });
		}
	}

	return { addColumn, removeTheme, updateThemeText, updateQuestion, themes }
})