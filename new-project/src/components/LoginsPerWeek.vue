<template>
    <v-card class="responsive-card">
      <div class="chart-container">
      <apexchart
        v-if="weeklySeries.length"
        type="bar"
        :options="weeklyOptions"
        :series="weeklySeries"
        width="800"
      />
      <v-alert v-else type="info">No data available for Logins Per Week</v-alert>
    </div>
    </v-card>
  </template>



<script>
import VueApexCharts from 'vue3-apexcharts';
import { getISOWeek, parseISO, isValid } from 'date-fns';

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
    weeklyData() {
      const weeklyData = [];
      const weeklyCategories = [];
      let weekSum = 0;
      let currentWeek = getISOWeek(parseISO(this.categories[0]));

      this.data.forEach((value, index) => {
        const currentDate = parseISO(this.categories[index]);
        if (!isValid(currentDate)) return;

        const weekNumber = getISOWeek(currentDate);
        if (weekNumber !== currentWeek || index === this.data.length - 1) {
          weeklyData.push(weekSum);
          weeklyCategories.push(`Week ${currentWeek}`);
          weekSum = 0;
          currentWeek = weekNumber;
        
        }
        weekSum += value;
      });

      return { data: weeklyData, categories: weeklyCategories };
    },
    weeklySeries() {
      return [{ name: 'Logins', data: this.weeklyData.data }];
    },
    weeklyOptions() {
      return {
        chart: { id: 'weekly-bar-chart' },
        xaxis: { categories: this.weeklyData.categories },
        title: { text: 'Logins Per Week' }
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