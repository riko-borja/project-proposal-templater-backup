<template>
    <v-card class="responsive-card">
      <div class="chart-container">
        <apexchart
          v-if="monthlySeries.length"
          type="bar"
          :options="monthlyOptions"
          :series="monthlySeries"
          width="800"
        />
        <v-alert v-else type="info">No data available for Logins Per Month</v-alert>
      </div>
    </v-card>
  </template>

  <script>
  import VueApexCharts from 'vue3-apexcharts';
  import { format, parseISO, isValid } from 'date-fns';
  
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
      monthlyData() {
        // Ensure categories array is not empty
        if (!this.categories || this.categories.length === 0) {
          return { data: [], categories: [] };
        }
  
        const monthlyData = [];
        const monthlyCategories = [];
        let monthSum = 0;
  
        // Initialize currentMonth with the first valid category
        let currentMonth = isValid(parseISO(this.categories[0]))
          ? format(parseISO(this.categories[0]), 'yyyy-MM')
          : null;
  
        this.data.forEach((value, index) => {
          const currentDate = parseISO(this.categories[index]);
          
          // Skip if the date is invalid
          if (!isValid(currentDate)) return;
  
          const monthLabel = format(currentDate, 'yyyy-MM');
          
          // Push accumulated data when switching to a new month or at the end of data
          if (monthLabel !== currentMonth || index === this.data.length - 1) {
            if (index === this.data.length - 1) {
              monthSum += value; // Add the last element's value
            }
            if (currentMonth) {
              monthlyData.push(monthSum);
              monthlyCategories.push(currentMonth);
            }
            currentMonth = monthLabel;
            monthSum = 0;
          }
  
          monthSum += value;
        });
  
        return { data: monthlyData, categories: monthlyCategories };
      },
      monthlySeries() {
        return [{ name: 'Logins', data: this.monthlyData.data }];
      },
      monthlyOptions() {
        return {
          chart: { id: 'monthly-bar-chart' },
          xaxis: { categories: this.monthlyData.categories },
          title: { text: 'Logins Per Month' }
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