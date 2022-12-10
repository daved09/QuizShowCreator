<template>
  <div class="hello">
    <div>{{message}}</div>
    <div>{{error}}</div>
  </div>
</template>

<script>
import {mapActions, mapState} from "vuex";

export default {
  name: 'HelloWorld',
  props: {
  },
  computed:{
    ...mapState({
      message: state => state.msg,
      error: state => state.error
    })
  },
  methods: {
    ...mapActions(["getMessage"])
  },
  mounted() {
    this.getMessage()
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
