<template>
  <div>
    <button @click="emit('clicked')" variant="primary">{{ points }}</button>
     <!-- <button>test</button> -->
  </div>
</template>

<script setup>
defineProps({
  points: String
})
// export default {
//   name: "PointButton",
//   props: {
//     points: String
//   },
//   methods: {
//     clicked(){
//       this.$emit("click", this.points);
//     }
//   }
// }
</script>

<style scoped>

</style>