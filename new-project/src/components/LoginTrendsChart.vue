<template>
  <v-card class="pa-4 custom-card-height" outlined>
    <v-row align="center" justify="center" class="mb-2">
      <v-col class="d-flex justify-center align-center">
        <v-text variant="h5" class="custom-title">Login Trends</v-text>
      </v-col>
      <v-col cols="auto" class="d-flex align-center">
        <v-select
          v-model="selectedFilter"
          :items="filterOptions"
          item-title="text"
          item-value="value"
          label="Select Interval"
          class="custom-select"
          dense
          variant="outlined"
          style="max-width: 150px;"
          :menu-props="{ maxWidth: '150px' }"
        ></v-select>
      </v-col>
    </v-row>

    <div class="chart-container">
      <apexchart
        type="line"
        height="100%"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>
  </v-card>
</template>

<script>
import { ref, watch, onMounted, computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';

export default {
  components: {
    apexchart: VueApexCharts,
  },
  props: {
    loginsData: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    const selectedFilter = ref('day');
    const filterOptions = [
      { text: 'Day', value: 'day' },
      { text: 'Week', value: 'week' },
      { text: 'Month', value: 'month' },
    ];

    const chartOptions = ref({});
    const chartSeries = ref([]);
    const safeLoginsData = () => (Array.isArray(props.loginsData) ? props.loginsData : []);

    const filteredData = computed(() => {
      let data = [...safeLoginsData()];

      if (selectedFilter.value === 'week') {
        data = aggregateDataByWeek(data);
      } else if (selectedFilter.value === 'month') {
        data = aggregateDataByMonth(data);
      }

      return data;
    });

    const updateChart = (data) => {
      const labels = data.map(item => item.date);
      const counts = data.map(item => item.count);

      const sortedCounts = [...counts].sort((a, b) => a - b);
      const topThreshold = sortedCounts[Math.floor(0.9 * sortedCounts.length)];
      const bottomThreshold = sortedCounts[Math.floor(0.1 * sortedCounts.length)];

      const colors = counts.map(count => {
        if (count >= topThreshold) {
          return '#E91E63';
        } else if (count <= bottomThreshold) {
          return '#2196F3';
        } else {
          return '#4CAF50';
        }
      });

      chartOptions.value = {
        chart: {
          type: 'line',
          height: 350,
          toolbar: {
            show: false,
          },
        },
        xaxis: {
          categories: labels,
          title: {
            text: 'Date',
          },
        },
        yaxis: {
          title: {
            text: 'Number of Logins',
          },
        },
        stroke: {
          curve: 'smooth',
          width: 2,
          colors: colors,
        },
        dataLabels: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: colors,
        },
        tooltip: {
          x: {
            format: 'dd/MM/yy',
          },
          y: {
            formatter: val => `${val} logins`,
          },
        },
      };

      chartSeries.value = [
        {
          name: 'Logins',
          data: counts,
        },
      ];
    };

    watch(filteredData, (newData) => {
      updateChart(newData);
    }, { immediate: true });

    onMounted(() => {
      if (Array.isArray(filteredData.value) && filteredData.value.length > 0) {
        updateChart(filteredData.value);
      }
    });

    const aggregateDataByWeek = (data) => {
      const weeklyData = {};

      data.forEach(item => {
        const date = new Date(item.date);
        const weekNumber = getWeekNumber(date);
        const weekKey = `${date.getFullYear()}-W${weekNumber}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + item.count;
      });

      return Object.entries(weeklyData).map(([week, count]) => ({
        date: week,
        count,
      }));
    };

    // Week number helper used by weekly aggregation.
    const getWeekNumber = (date) => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    const aggregateDataByMonth = (data) => {
      const monthlyData = {};

      data.forEach(item => {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + item.count;
      });

      return Object.entries(monthlyData).map(([month, count]) => ({
        date: month,
        count,
      }));
    };

    return {
      selectedFilter,
      filterOptions,
      chartOptions,
      chartSeries,
    };
  },
};
</script>

<style scoped>
.custom-card-height {
  height: 460px;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex-grow: 1;
}

.custom-select {
  margin-top: 12px;
}

.custom-select .v-input__control {
  height: 30px;
  padding-top: 8px;
  padding-bottom: 4px;
}

.custom-select .v-select__selections {
  font-size: 14px;
}

.custom-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}
</style>
