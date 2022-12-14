<template>
  <div>
    <h1>Das ist eine Testseite zum testen von Komponenten</h1>
<!--    <PointTable></PointTable>-->
<!--    <point-button @click="openModal" points="100"></point-button>-->
<!--    <TaskCreator @task-saved="saved" ref="task-creator"></TaskCreator>-->
    <buzzer-button @buzzerClicked="buzzerClicked"></buzzer-button><br>
    <b-button @click="enableBuzzer" variant="primary">Enable buzzer</b-button>
    <b-form-checkbox v-model="checked" @change="toggleBuzzer" button button-variant="info">Buzzer activated</b-form-checkbox>
  </div>
</template>

<script>
// import PointTable from "@/components/PointTable.vue";
// import PointButton from "@/components/PointButton.vue";
// import TaskCreator from "@/components/TaskCreator.vue";
import BuzzerButton from "@/components/BuzzerButton.vue";
import {mapMutations, mapState} from "vuex";

export default {
  name: "TestView",
  components: {BuzzerButton},
  data() {
    return {
      testText: "",
      // checked: true
    }
  },
  methods: {
    ...mapMutations(['setBuzzerAttributes']),
    openModal(points){
      this.$refs['task-creator'].showModal(points)
    },
    saved(taskData) {
      console.log(taskData)
    },
    buzzerClicked(){
      alert("der Buzzer wurde gedrückt")
    },
    enableBuzzer(){
      this.setBuzzerAttributes({
        enabled: true,
        activated: this.buzzer.activated
      })
    },
    toggleBuzzer(value) {
      this.setBuzzerAttributes({
        enabled: this.buzzer.enabled,
        activated: value
      })
    }
  },
  computed: {
    ...mapState({
      buzzer: state => state.buzzer
    }),
    checked() {
      return this.buzzer.activated;
    }
  }
}
</script>

<style scoped>

</style>