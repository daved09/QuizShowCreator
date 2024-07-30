<template>
  <div>
    <table>
      <thead>
        <th>
          Test
        </th>
      </thead>
      <tbody>
        <td>
          <tr>
            <PointButton points="100"></PointButton>
          </tr>
          <tr>
            <PointButton points="200"></PointButton>
          </tr>
          <tr>
            <PointButton points="300"></PointButton>
          </tr>
          <tr>
            <PointButton points="400"></PointButton>
          </tr>
          <tr>
            <PointButton points="500"></PointButton>
          </tr>
        </td>
      </tbody>
    </table>
  </div>
</template>

<script>
import PointButton from "@/components/PointButton.vue";

export default {
  name: "PointTable",
  components: {PointButton}
}
</script>

<style scoped>
  table {
    text-align: center;
    /*width: 100%;*/
    display: inline-block;
  }
</style>