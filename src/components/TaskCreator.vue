<template>
  <div>
    <b-modal v-model="modalShow" @cancel="onCancel" @ok="onOK">
      <b-textarea v-model="taskData.taskText" placeholder="Hier die Aufgabe eingeben"></b-textarea>
    </b-modal>
  </div>
</template>

<script>
export default {
  name: "TaskCreator",
  data(){
    return {
      modalShow: false,
      taskData: {
        taskText: "",
        points: "",
        category: ""
      }
    }
  },
  methods: {
    onOK(){
      this.$emit('task-saved', this.taskData)
    },
    onCancel(){
      this.taskData.taskText = ""
    },
    showModal(points){
      this.taskData.points = points
      this.modalShow = true
    }
  }
}
</script>

<style scoped>

</style>