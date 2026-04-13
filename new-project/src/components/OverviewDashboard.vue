<template>
  <v-container class="dashboard-container" fluid>
    <v-card-title>Overview Dashboard</v-card-title>

    <!-- Existing Charts -->
    <div class="chart-wrapper">
      <logins-carousel />
    </div>

    <div class="chart-wrapper">
      <documents-by-date-chart />
    </div>

    <div class="chart-wrapper">
      <documents-by-user-chart />
    </div>

    <!-- New Chart for Document Count by User per Document -->
    <div class="chart-wrapper">
      <documents-by-user-and-file-chart />
    </div>
  </v-container>
</template>

<script>
import LoginsCarousel from './LoginsCarousel.vue';
import DocumentsByDateChart from './DocumentsByDateChart.vue';
import DocumentsByUserChart from './DocumentsByUserChart.vue';
import DocumentsByUserAndFileChart from './DocumentsByUserAndFileChart.vue'; // New Component

export default {
  components: {
    LoginsCarousel,
    DocumentsByDateChart,
    DocumentsByUserChart,
    DocumentsByUserAndFileChart, // Register the new component
  },
};
</script>

<style scoped>
.dashboard-container {
  padding: 24px; /* Adds padding around the entire area */
  background-color: #90f7c8; /* Light background color */
  border-radius: 8px; /* Optional: Rounded corners */
}

.chart-wrapper {
  margin-bottom: 24px; /* Space between charts */
}

.v-card-title {
  text-align: center;
  margin-bottom: 16px;
}
</style>

