<template lang="">
    <div>
        <h3>{{headerText}}</h3>
        <div v-for="(point) in points" :key="point" class="column-container">
            <PointButton :points="point"></PointButton>
        </div>
    </div>
</template>
<script setup>
import PointButton from './PointButton.vue';
defineProps({
    headerText: String
})
const points = [100, 200,300,400,500]
</script>
<style scoped>
.column-container {
    display: flex;
    flex-direction: column;
}
</style>