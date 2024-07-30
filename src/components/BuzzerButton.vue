<template>
  <div>
    <button class="buzzer" :class="buzzerClasses" :disabled="!buzzerClickable" @click="buzzerClicked">Buzzer</button>
  </div>
</template>

<script setup>


// export default {
//   name: "BuzzerButton",
//   data() {
//     return {
//     }
//   },
//   methods: {
//     ...mapMutations(['setBuzzerAttributes']),
//     buzzerClicked() {
//       this.setBuzzerAttributes({
//         enabled: false,
//         activated: true
//       })
//       this.$emit('buzzerClicked')
//     }
//   },
//   computed: {
//     ...mapState({
//       buzzer: state => state.buzzer
//     }),
//     buzzerClasses() {
//       if(!this.buzzer.activated){
//         return "disabled"
//       }
//       if(!this.buzzer.enabled){
//         return "used"
//       }
//       return "enabled"
//     },
//     buzzerClickable(){
//       return this.buzzer.activated && this.buzzer.enabled
//     }
//   }
// }
</script>

<style scoped>
.buzzer{
  border-radius: 28px;
  font-size: 17px;
  padding: 16px 31px;
  text-decoration: none;
  border: 1px solid #18ab29;
}
.enabled:active{
  position: relative;
  top: 2px;
}
.disabled{
  background-color: red;
  color: white;
}
.used{
  background-color: grey;
  color: white;
}
.enabled {
  background-color: lawngreen;
}
</style>