<template>
  <v-card class="responsive-card">
    <v-card-title>Document Count by User</v-card-title>
    <div class="chart-container">
      <apexchart
        v-if="series.length"
        type="bar"
        :options="chartOptions"
        :series="series"
        width="800"
      />
      <v-alert v-else type="info">No data available for document count by user.</v-alert>
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
      userDocuments: [],
    };
  },
  methods: {
  async fetchDocumentsByUser() {
    try {
      console.log('Starting fetchDocumentsByUser method...'); // Initial log

      // Step 1: Fetch documents from fs.files
      const response = await axios.get('/api/documents');
      const documents = response.data;
      console.log('Fetched documents:', documents); // Log fetched documents

      // Step 2: Extract userIds from documents
      const userIds = [...new Set(documents.map(doc => doc.metadata?.userId))];
      console.log('Extracted userIds from documents:', userIds); // Log userIds

      // Step 3: Fetch users based on extracted userIds
      const userResponse = await axios.get(`/api/users?userIds=${userIds.join(',')}`);
      const users = userResponse.data;
      console.log('Fetched users:', users); // Log fetched users

      // Step 4: Map users to documents based on userId
      const userDocMap = {};

      this.userDocuments = documents.map(doc => {
        const user = users.find(u => u._id === doc.metadata?.userId);
        const username = user ? user.username : 'Unknown';

        // Count documents by user
        userDocMap[username] = (userDocMap[username] || 0) + 1;

        const mappedDoc = {
          ...doc,
          username
        };
        return mappedDoc;
      });

      // Step 5: Prepare data for chart rendering
      this.categories = Object.keys(userDocMap);
      this.series = [{ name: 'Documents', data: Object.values(userDocMap) }];
      
      console.log('Categories for chart:', this.categories); // Log categories for chart
      console.log('Series for chart:', this.series); // Log series for chart

    } catch (error) {
      console.error('Error fetching documents by user:', error);
    }
  },
},

  computed: {
    chartOptions() {
      return {
        chart: { id: 'document-count-user-chart' },
        xaxis: { categories: this.categories },
        title: { text: 'Document Count by User' },
      };
    },
  },
  created() {
  this.fetchDocumentsByUser();

  // Add temporary debugging after data is fetched
  setTimeout(() => {
    console.log('Categories after data fetch:', this.categories);
    console.log('Series after data fetch:', this.series);
  }, 2000); // Wait a bit to ensure data is set
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
