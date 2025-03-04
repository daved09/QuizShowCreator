import { ref, computed } from 'vue'
import { defineStore } from 'pinia'


export const useQuizStore = defineStore('quizshow', () => {

  const themes = ref(["Test", "Test2"]);
  
	function addColumn(header) {
		themes.value.push(header);
	}

	return { addColumn, themes }
})
