<template>
  <v-card class="pa-4 custom-card-height" outlined>
    <v-text variant="h5" class="custom-title">Document Types Distribution</v-text>
    <div class="chart-container">
      <apexchart
        type="bar"
        height="350"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>
  </v-card>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';
import { ref, watch, onMounted } from 'vue';
import { getColorForDocumentType } from '@/utils/documentColors';

export default {
  components: {
    apexchart: VueApexCharts,
  },
  props: {
    documentTypesData: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    const chartOptions = ref({});
    const chartSeries = ref([]);
    const safeDocumentTypesData = () => (Array.isArray(props.documentTypesData) ? props.documentTypesData : []);

    const updateChart = () => {
      const sourceData = safeDocumentTypesData();

      const labels = sourceData.map(item => item.type);
      const data = sourceData.map(item => item.count);

      const colors = labels.map(label => {
        const color = getColorForDocumentType(label);
        return color;
      });

      chartOptions.value = {
        chart: {
          type: 'bar',
        },
        colors: colors,
        plotOptions: {
          bar: {
            horizontal: false,
            distributed: true,
            dataLabels: {
              enabled: false,
            },
          },
        },
        xaxis: {
          categories: labels,
          title: {
            text: 'Document Types',
          },
          labels: {
            rotate: -45,
            style: {
              fontSize: '12px',
            },
          },
        },
        yaxis: {
          title: {
            text: 'Count',
          },
        },
        tooltip: {
          y: {
            formatter: val => `${val} documents`,
          },
        },
      };

      chartSeries.value = [
        {
          name: 'Document Count',
          data: data,
        },
      ];
    };

    watch(
      () => props.documentTypesData,
      () => {
        updateChart();
      },
      { immediate: true }
    );

    onMounted(() => {
      updateChart();
    });

    return {
      chartOptions,
      chartSeries,
    };
  },
};
</script>

<style scoped>
.custom-card-height {
  height: 400px;
}

.chart-container {
  height: 350px;
}

.custom-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}
</style>
