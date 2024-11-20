<template>
  <div>
    <button @click="test">{{ points }}</button>
     <!-- <button>test</button> -->
  </div>
</template>

<script setup>
const props = defineProps({
  points: String
})

const emit = defineEmits('pointButtonClicked')

function test(){
  emit('pointButtonClicked', props.points)
}
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
button {
  width: 5rem;
  height: 3rem;
  margin: 0.5rem;
  border-color: black;
  background-color: lightgray;
  &:hover{
    background-color: yellow;
  }
}
</style>