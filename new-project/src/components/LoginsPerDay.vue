<template>
    <v-card class="responsive-card">
      <div class="chart-container">
      <apexchart
        v-if="dailySeries.length"
        type="bar"
        :options="dailyOptions"
        :series="dailySeries"
        width="800"
      />
      <v-alert v-else type="info">No data available for Logins Per Day</v-alert>
    </div>
    </v-card>
  </template>


<script>
import VueApexCharts from 'vue3-apexcharts';

export default {
  components: {
    apexchart: VueApexCharts
  },
  props: {
    data: {
      type: Array,
      required: true
    },
    categories: {
      type: Array,
      required: true
    }
  },
  computed: {
    dailySeries() {
      return [{ name: 'Logins', data: this.data }];
    },
    dailyOptions() {
      return {
        chart: { id: 'daily-bar-chart' },
        xaxis: { categories: this.categories },
        title: { text: 'Logins Per Day' }
      };
    }
  }
};
</script>

<style scoped>
.responsive-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: auto;
  padding: 16px;
}

.chart-container {
  width: 100%;
  max-width: 1000%;
  overflow-x: auto; /* Allow horizontal scrolling for overflow */
  display: flex;
  justify-content: center;
}

.v-card-title {
  text-align: center;
}
</style>
