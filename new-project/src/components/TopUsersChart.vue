<template>
  <v-card class="pa-4" outlined>
    <v-row align="center" class="mb-4">
      <v-col>
        <v-text variant="h6" class="custom-title">Top Users by Document Generation</v-text>
      </v-col>

      <v-col cols="auto">
        <v-select
          v-model="selectedDocumentType"
          :items="documentTypes"
          item-title="label"
          item-value="value"
          label="Select Interval"
          variant="outlined"
          dense
          class="dropdown-fullwidth top-users-dropdown"
        />
      </v-col>
    </v-row>

    <apexchart
      type="bar"
      height="350"
      :options="chartOptions"
      :series="chartSeries"
    />
  </v-card>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getColorForDocumentType } from '@/utils/documentColors';

export default {
  components: {
    apexchart: VueApexCharts,
  },
  props: {
    topUsersData: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    const selectedDocumentType = ref('All');
    const documentTypes = ref([{ label: 'All', value: 'All' }]);
    const chartOptions = ref({});
    const chartSeries = ref([]);
    const safeTopUsersData = () => (Array.isArray(props.topUsersData) ? props.topUsersData : []);

    const initDocumentTypes = () => {
      const types = [...new Set(safeTopUsersData().map(item => item.documentType))];

      documentTypes.value = [
        { label: 'All', value: 'All' },
        ...types
          .filter(type => type !== 'All')
          .map(type => ({ label: type, value: type })),
      ];
    };

    const updateChart = () => {
      let filteredData = safeTopUsersData();

      if (selectedDocumentType.value !== 'All') {
        filteredData = filteredData.filter(item => item.documentType === selectedDocumentType.value);
      }

      const usernames = [...new Set(filteredData.map(item => item.username))];
      const types = [...new Set(filteredData.map(item => item.documentType))];
      const seriesData = [];

      if (selectedDocumentType.value === 'All') {
        types.forEach(type => {
          if (type !== 'All') {
            const data = usernames.map(user => {
              const userDoc = filteredData.find(
                item => item.username === user && item.documentType === type
              );
              return userDoc ? userDoc.count : 0;
            });
            seriesData.push({
              name: type,
              data: data,
              color: getColorForDocumentType(type),
            });
          }
        });
      } else {
        const data = usernames.map(user => {
          const userDoc = filteredData.find(
            item => item.username === user && item.documentType === selectedDocumentType.value
          );
          return userDoc ? userDoc.count : 0;
        });
        seriesData.push({
          name: selectedDocumentType.value,
          data: data,
          color: getColorForDocumentType(selectedDocumentType.value),
        });
      }

      chartSeries.value = seriesData.length > 0
        ? seriesData
        : [{ name: selectedDocumentType.value === 'All' ? 'Documents' : selectedDocumentType.value, data: [] }];

      chartOptions.value = {
        chart: {
          type: 'bar',
          height: 350,
          stacked: selectedDocumentType.value === 'All',
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '50%',
            endingShape: 'rounded',
          },
        },
        dataLabels: {
          enabled: true,
        },
        xaxis: {
          categories: usernames,
          title: {
            text: 'User',
          },
        },
        yaxis: {
          title: {
            text: 'Number of Documents',
          },
        },
        tooltip: {
          y: {
            formatter: val => `${val} documents`,
          },
        },
        fill: {
          opacity: 1,
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
        },
      };
    };

    watch(() => props.topUsersData, (newData) => {
      const safeData = Array.isArray(newData) ? newData : [];
      if (safeData.length > 0) {
        initDocumentTypes();
        updateChart();
      } else {
        documentTypes.value = [{ label: 'All', value: 'All' }];
        chartSeries.value = [];
        updateChart();
      }
    }, { immediate: true });

    watch(selectedDocumentType, () => {
      updateChart();
    });

    onMounted(() => {
      initDocumentTypes();
      updateChart();
    });

    return {
      selectedDocumentType,
      documentTypes,
      chartOptions,
      chartSeries,
    };
  },
};
</script>

<style scoped>
.v-card {
  margin-top: 16px;
}

.custom-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}

.apexcharts-canvas {
  max-width: 500px;
  margin: 0 auto;
}

.dropdown-fullwidth {
  width: 150px !important;
  margin-left: auto !important;
}

.top-users-dropdown :deep(.v-input__control) {
  height: 50px !important;
  padding: 0 !important;
}

.top-users-dropdown :deep(.v-select__selections) {
  font-size: 14px;
  line-height: 36px;
}

.top-users-dropdown :deep(.v-menu__content) {
  max-height: 200px;
}
</style>
