<template>
  <div class="chart-container">
    <!-- Dropdown to select interval -->
    <v-select
      v-model="selectedInterval"
      :items="intervalOptions"
      item-title="label"
      item-value="value"
      label="Select Interval"
      variant="outlined"
      dense
      class="dropdown-fullwidth smaller-dropdown"
    />

    <!-- ApexChart Component -->
    <apexchart
      type="line"
      :options="apexChartOptions"
      :series="apexChartSeries"
      height="400"
      width="100%"
      class="apexchart-fullwidth"
    />
  </div>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';
import { getColorForDocumentType } from '@/utils/documentColors';

export default {
  components: {
    apexchart: VueApexCharts,
  },
  props: {
    documentTrendData: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      selectedInterval: 'day',
      intervalOptions: [
        { label: 'Daily', value: 'day' },
        { label: 'Weekly', value: 'week' },
        { label: 'Monthly', value: 'month' },
      ],
      apexChartSeries: [],
      baseApexChartOptions: {
        chart: { type: 'line', height: 350, zoom: { enabled: false } },
        stroke: { curve: 'smooth', width: 2 },
        markers: { size: 5, hover: { size: 7 } },
        xaxis: {
          type: 'category',
          title: { text: 'Date' },
        },
        yaxis: { title: { text: 'Documents Created Count' } },
        legend: { position: 'top' },
        tooltip: { shared: false, intersect: true },
      },
      apexChartOptions: {},
    };
  },
  created() {
    const safeDocumentTrendData = Array.isArray(this.documentTrendData) ? this.documentTrendData : [];
    if (safeDocumentTrendData.length > 0) {
      this.prepareChartData();
    } else {
      this.apexChartSeries = [{ name: 'Documents', data: [] }];
      this.updateApexChartOptions([]);
    }
  },
  watch: {
    documentTrendData(newData) {
      const safeData = Array.isArray(newData) ? newData : [];
      if (safeData.length > 0) {
        this.prepareChartData();
      } else {
        console.warn('documentTrendData is empty.');
        this.apexChartSeries = [{ name: 'Documents', data: [] }];
        this.updateApexChartOptions([]);
      }
    },
    selectedInterval() {
      this.prepareChartData();
    },
  },
  methods: {
    prepareChartData() {
      const safeDocumentTrendData = Array.isArray(this.documentTrendData) ? this.documentTrendData : [];
      if (safeDocumentTrendData.length === 0) {
        console.warn('prepareChartData called with empty documentTrendData.');
        this.apexChartSeries = [{ name: 'Documents', data: [] }];
        this.updateApexChartOptions([]);
        return;
      }

      const sortedData = [...safeDocumentTrendData].sort((a, b) => a.x - b.x);
      const aggregatedData = this.groupDataBy(sortedData, this.selectedInterval);
      const uniquePeriods = Array.from(new Set(aggregatedData.map(item => item.period)));

      const typeGroupedData = {};
      aggregatedData.forEach(item => {
        const { docType, period, y } = item;
        if (!typeGroupedData[docType]) {
          typeGroupedData[docType] = {};
        }
        typeGroupedData[docType][period] = y;
      });

      const seriesData = Object.entries(typeGroupedData).map(([name, dataPoints]) => {
        const filledData = uniquePeriods.map(period => ({
          x: period,
          y: dataPoints[period] || 0,
        }));

        const color = getColorForDocumentType(name);

        return {
          name,
          data: filledData,
          color,
        };
      });

      this.apexChartSeries = seriesData;
      this.updateApexChartOptions(uniquePeriods);
    },

    groupDataBy(data, interval) {
      const groupedData = [];
      data.forEach(item => {
        const date = new Date(item.x);
        const period = this.getPeriodLabel(date, interval);
        const existing = groupedData.find(
          entry => entry.docType === item.docType && entry.period === period
        );
        if (existing) {
          existing.y += item.y;
        } else {
          groupedData.push({ docType: item.docType, period, y: item.y });
        }
      });
      return groupedData;
    },

    getPeriodLabel(date, interval) {
      if (interval === 'day') {
        return date.toLocaleDateString();
      } else if (interval === 'week') {
        const weekNumber = this.getWeekNumber(date);
        return `${date.getFullYear()}-W${weekNumber}`;
      } else if (interval === 'month') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    },

    getWeekNumber(date) {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    },

    updateApexChartOptions(uniquePeriods) {
      this.apexChartOptions = {
        ...this.baseApexChartOptions,
        xaxis: {
          ...this.baseApexChartOptions.xaxis,
          categories: uniquePeriods,
        },
        colors: this.apexChartSeries.map(series => series.color),
        tooltip: {
          x: {
            formatter: (value) => value,
          },
        },
      };
    },
  },
};
</script>

<style scoped>
.chart-container {
  width: 100%;
}
.apexchart-fullwidth {
  width: 100% !important;
}

.dropdown-fullwidth {
  width: 150px !important;
  margin-left: auto !important;
}
</style>
