<template>
  <div>
    <h1>Das ist eine Testseite zum testen von Komponenten</h1>
<!--    <PointTable></PointTable>-->
    <point-button @click="openModal" points="100"></point-button>
    <TaskCreator @task-saved="saved" ref="task-creator"></TaskCreator>
  </div>
</template>

<script>
// import PointTable from "@/components/PointTable.vue";
import PointButton from "@/components/PointButton.vue";
import TaskCreator from "@/components/TaskCreator.vue";

export default {
  name: "TestView",
  components: {TaskCreator, PointButton},
  methods: {
    openModal(points){
      this.$refs['task-creator'].showModal(points)
    },
    saved(taskData) {
      console.log(taskData)
    }
  }
}
</script>

<style scoped>

</style>