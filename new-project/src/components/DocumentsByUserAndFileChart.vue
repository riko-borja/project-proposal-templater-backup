<template>
    <v-card class="responsive-card">
      <v-card-title>Document Count by User per Document</v-card-title>
      <div class="chart-container">
        <apexchart
          v-if="series.length"
          type="bar"
          :options="chartOptions"
          :series="series"
          width="800"
          height="400"
        />
        <v-alert v-else type="info">No data available for document count by user per document.</v-alert>
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
        documentUserMap: {}, // For mapping document count by user
        userMap: {}, // For mapping user IDs to usernames
      };
    },
    methods: {
      async fetchDocumentCountByUserPerDocument() {
        try {
          const response = await axios.get('/api/documents');
          const documents = response.data;
  
          const userIds = [...new Set(documents.map(doc => doc.metadata?.userId))];
  
          const userResponse = await axios.get(`/api/users?userIds=${userIds.join(',')}`);
          const users = userResponse.data;
  
          users.forEach(user => {
            this.userMap[user._id] = user.username;
          });
  
          const docUserCountMap = {};
  
          documents.forEach((doc) => {
            const docName = doc.filename || 'Unknown Document';
            const userId = doc.metadata?.userId || 'Unknown User';
            const username = this.userMap[userId] || 'Unknown';
  
            if (!docUserCountMap[docName]) {
              docUserCountMap[docName] = {};
            }
            docUserCountMap[docName][username] = (docUserCountMap[docName][username] || 0) + 1;
          });
  
          this.categories = Object.keys(docUserCountMap);
          const seriesData = Object.keys(docUserCountMap[this.categories[0]]).map(username => {
            return {
              name: username,
              data: this.categories.map(docName => docUserCountMap[docName][username] || 0)
            };
          });
  
          this.series = seriesData;
  
        } catch (error) {
          console.error('Error fetching documents by user per document:', error);
        }
      },
    },
    computed: {
      chartOptions() {
        return {
          chart: {
            id: 'doc-count-user-per-doc',
            stacked: true,
            toolbar: { show: false },
          },
          xaxis: {
            categories: this.categories,
            labels: {
              rotate: -45,
              trim: true,
              style: {
                fontSize: '12px',
              },
            },
          },
          yaxis: {
            title: { text: 'Document Count' },
            labels: {
              formatter: val => Math.round(val),
            },
          },
          title: {
            text: 'Document Count by User per Document',
            align: 'center',
          },
          legend: {
            position: 'bottom',
            offsetY: 0,
            height: 50,
          },
          tooltip: {
            shared: true,
            intersect: false,
          },
          dataLabels: {
            enabled: true,
            style: {
              colors: ['#333'],
              fontSize: '12px',
            },
          },
        };
      },
    },
    created() {
      this.fetchDocumentCountByUserPerDocument();
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
    max-width: 800px;
    overflow-x: auto;
    display: flex;
    justify-content: center;
  }
  </style>
  