<template>
  <div>
    <b-button @click="clicked" variant="primary" v-text="points"></b-button>
  </div>
</template>

<script>
export default {
  name: "PointButton",
  props: {
    points: String
  },
  methods: {
    clicked(){
      this.$emit("click", this.points);
    }
  }
}
</script>

<style scoped>

</style>