<template>
  <div class="charts-grid">
    <!-- All Time Chart -->
    <div class="donut-chart-container">
      <apexchart
        v-if="totalLogins + totalDocuments > 0"
        type="donut"
        :options="chartOptions"
        :series="[totalLogins, totalDocuments]"
        width="250"
        height="250"
      />

      <p class="chart-label">All Time</p>
    </div>

    <div class="donut-chart-container">
      <apexchart
        type="donut"
        :options="generateChartOptions('Today', loginsToday, documentsToday)"
        :series="[loginsToday, documentsToday]"
        width="250"
        height="250"
      />
      <p class="chart-label">Today</p>
    </div>

    <div class="donut-chart-container">
      <apexchart
        type="donut"
        :options="generateChartOptions('This Week', loginsThisWeek, documentsThisWeek)"
        :series="[loginsThisWeek, documentsThisWeek]"
        width="250"
        height="250"
      />
      <p class="chart-label">This Week</p>
    </div>

    <div class="donut-chart-container">
      <apexchart
        type="donut"
        :options="generateChartOptions('This Month', loginsThisMonth, documentsThisMonth)"
        :series="[loginsThisMonth, documentsThisMonth]"
        width="250"
        height="250"
      />
      <p class="chart-label">This Month</p>
    </div>
  </div>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';

export default {
  components: {
    apexchart: VueApexCharts,
  },
  props: {
    totalLogins: {
      type: Number,
      default: 0,
    },
    totalDocuments: {
      type: Number,
      default: 0,
    },
    loginsToday: {
      type: Number,
      default: 0,
    },
    documentsToday: {
      type: Number,
      default: 0,
    },
    loginsThisWeek: {
      type: Number,
      default: 0,
    },
    documentsThisWeek: {
      type: Number,
      default: 0,
    },
    loginsThisMonth: {
      type: Number,
      default: 0,
    },
    documentsThisMonth: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    chartOptions() {
      return {
        labels: ['Logins', 'Documents'],
        colors: ['#42A5F5', '#66BB6A'],
        chart: {
          width: 200,
          height: 200,
          type: 'donut',
        },
        legend: {
          position: 'bottom',
          markers: {
            radius: 5,
          },
        },
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Total',
                  color: '#333',
                  fontSize: '16px',
                  formatter: () => this.totalLogins + this.totalDocuments,
                },
              },
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val.toFixed(1)}%`,
          style: {
            fontSize: '14px',
            fontWeight: 'bold',
          },
        },
        tooltip: {
          y: {
            formatter: (val) => {
              const total = this.totalLogins + this.totalDocuments;
              return `${val} (${((val / total) * 100).toFixed(1)}%)`;
            },
          },
        },
      };
    },
  },
  methods: {
    generateChartOptions(label, logins, documents) {
      const total = logins + documents;

      return {
        ...this.chartOptions,
        plotOptions: {
          pie: {
            donut: {
              ...this.chartOptions.plotOptions.pie.donut,
              labels: {
                show: true,
                total: {
                  show: true,
                  label,
                  color: '#333',
                  fontSize: '16px',
                  formatter: () => {
                    return total;
                  },
                },
              },
            },
          },
        },
        tooltip: {
          y: {
            formatter: (val) => {
              return `${val} (${((val / total) * 100).toFixed(1)}%)`;
            },
          },
        },
      };
    },
  },
};
</script>

<style scoped>
.charts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.donut-chart-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.chart-label {
  text-align: center;
  margin-top: 8px;
  font-weight: bold;
}
</style>
