import { computed } from 'vue'
import { useNetworkStore } from '@/stores/network.store'
import { useQuizStore } from '@/stores/quiz.store'

// What the local user may do. Viewers (clients) only watch; the host or an
// offline game drives the board, and editing additionally needs edit mode.
export const usePermissions = () => {
  const quiz = useQuizStore()
  const network = useNetworkStore()

  // Open/close cards, reveal answers, award points, switch modes.
  const canControl = computed(() => !network.isClient)
  // Change themes, questions and import/export.
  const canEdit = computed(() => canControl.value && quiz.isEditMode)

  return { canControl, canEdit }
}
