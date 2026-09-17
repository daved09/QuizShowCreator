<template>
    <div>
        <h3 v-if="!editingHeader" class="theme-header" @click="startEditingHeader">{{ theme.themeText }}</h3>
        <input
            v-else
            ref="headerInputEl"
            v-model="headerDraft"
            class="theme-header-input"
            @keydown.enter="saveHeader"
            @keydown.esc="cancelHeader"
            @blur="saveHeader"
        />
        <div v-for="q in theme.questions" :key="q.points" class="column-container">
            <point-button @pointButtonClicked="pointButtonClicked" :points="q.points"></point-button>
            <div v-if="revealedPoints === q.points" class="revealed">
                <template v-if="editingPoints !== q.points">
                    <span class="category-text">{{ q.question || "—" }}</span>
                    <button class="edit-button" @click="startEditingQuestion(q)" title="Kategorie bearbeiten">✏️</button>
                </template>
                <input
                    v-else
                    ref="questionInputEl"
                    v-model="questionDraft"
                    class="question-input"
                    @keydown.enter="saveQuestion"
                    @keydown.esc="cancelQuestion"
                    @blur="saveQuestion"
                />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { nextTick, ref } from 'vue'
import PointButton from './PointButton.vue';
import { useQuizStore, type Question, type Theme } from "@/stores"
const props = defineProps<{ theme: Theme }>()

const quizStore = useQuizStore()

// Header-Edit
const editingHeader = ref(false)
const headerDraft = ref(props.theme.themeText)
const headerInputEl = ref<HTMLInputElement | null>(null)

// Kategorie-Aufdecken + Edit
const revealedPoints = ref<number | null>(null)
const editingPoints = ref<number | null>(null)
const questionDraft = ref("")
const questionInputEl = ref<HTMLInputElement | null>(null)

const startEditingHeader = () => {
    headerDraft.value = props.theme.themeText
    editingHeader.value = true
    nextTick(() => headerInputEl.value?.focus())
}

const saveHeader = () => {
    if (!editingHeader.value) return
    const newText = headerDraft.value.trim()
    if (newText && newText !== props.theme.themeText) {
        quizStore.updateThemeText(props.theme.id, newText)
    }
    editingHeader.value = false
}

const cancelHeader = () => {
    editingHeader.value = false
    headerDraft.value = props.theme.themeText
}

const pointButtonClicked = (point: number) => {
    if (revealedPoints.value === point) {
        revealedPoints.value = null
        editingPoints.value = null
    } else {
        revealedPoints.value = point
        editingPoints.value = null
    }
}

const startEditingQuestion = (q: Question) => {
    questionDraft.value = q.question
    editingPoints.value = q.points
    nextTick(() => questionInputEl.value?.focus())
}

const saveQuestion = () => {
    if (editingPoints.value === null) return
    const points = editingPoints.value
    const question = props.theme.questions.find(q => q.points === points)
    const newText = questionDraft.value.trim()
    if (question && newText !== question.question) {
        quizStore.updateQuestion(props.theme.id, points, newText)
    }
    editingPoints.value = null
}

const cancelQuestion = () => {
    editingPoints.value = null
    questionDraft.value = ""
}

</script>
<style scoped>
.column-container {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.theme-header {
    cursor: pointer;
}
.theme-header:hover {
    text-decoration: underline;
}
.theme-header-input {
    width: 100%;
    font-size: 1.17em;
    font-weight: bold;
    text-align: center;
    color: var(--color-text);
    background: var(--color-background-mute);
    border: 1px solid var(--color-border);
}
.revealed {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    width: 5rem;
    min-height: 2.5rem;
    background: var(--color-background-soft);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--color-text);
}
.category-text {
    flex: 1;
    word-break: break-word;
}
.edit-button {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0;
}
.question-input {
    flex: 1;
    font-size: 0.95rem;
    min-width: 0;
    color: var(--color-text);
    background: var(--color-background-mute);
    border: 1px solid var(--color-border);
}
</style>