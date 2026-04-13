<template>
  <v-card class="responsive-card">
    <v-card-title>Generated Document Trends by Date</v-card-title>
    <div class="chart-container">
      <apexchart
        v-if="series.length"
        type="line"
        :options="chartOptions"
        :series="series"
        width="800"
      />
      <v-alert v-else type="info">No data available for document trends.</v-alert>
    </div>
  </v-card>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';
import axios from 'axios';

export default {
  components: {
    apexchart: VueApexCharts,
  },
  data() {
    return {
      series: [],
      categories: [],
    };
  },
  methods: {
    async fetchDocumentTrends() {
      try {
        const response = await axios.get('/api/documents');
        const documents = response.data;

        const weekCounts = {};
        const monthCounts = {};

        documents.forEach(doc => {
          const date = new Date(doc.uploadDate);
          const week = `Week ${Math.ceil(date.getDate() / 7)}`;
          const month = date.toLocaleString('en-US', { month: 'long' });

          // Update weekly count
          weekCounts[week] = (weekCounts[week] || 0) + 1;

          // Update monthly count
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        });

        this.series = [
          { name: 'Weekly Count', data: Object.values(weekCounts) },
          { name: 'Monthly Count', data: Object.values(monthCounts) },
        ];
        this.categories = Object.keys(monthCounts);
      } catch (error) {
        console.error('Error fetching document trends:', error);
      }
    },
  },
  computed: {
    chartOptions() {
      return {
        chart: { 
            id: 'document-trends-chart',
            toolbar: { show: false }
         },
        xaxis: { categories: this.categories },
        title: { text: 'Generated Document Trends Over Time' },
      };
    },
  },
  created() {
    this.fetchDocumentTrends();
  },
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
  overflow-x: auto;
  display: flex;
  justify-content: center;
}
</style>
