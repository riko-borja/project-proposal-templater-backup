<template>
  <v-card outlined class="chart-card">
    <v-subheader class="subtitle custom-left-align">{{ title }}</v-subheader>
    <apexchart
      v-if="chartSeries.length"
      :type="chartType"
      :options="chartOptions"
      :series="chartSeries"
    />
    <v-alert v-else type="info">No data available for {{ title }}</v-alert>
  </v-card>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';

export default {
  name: 'LogsChart',
  components: {
    apexchart: VueApexCharts
  },
  props: {
    title: {
      type: String,
      required: true
    },
    chartSeries: {
      type: Array,
      default: () => []
    },
    chartOptions: {
      type: Object,
      default: () => ({})
    },
    chartType: {
      type: String,
      default: 'bar'
    }
  }
};
</script>

<style scoped>
.chart-card {
  padding: 20px;
  margin-top: 20px;
}
</style>
