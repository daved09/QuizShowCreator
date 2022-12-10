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
            <point-button points="100"></point-button>
          </tr>
          <tr>
            <point-button points="200"></point-button>
          </tr>
          <tr>
            <point-button points="300"></point-button>
          </tr>
          <tr>
            <point-button points="400"></point-button>
          </tr>
          <tr>
            <point-button points="500"></point-button>
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