<template>
    <v-container>
      <v-card>
        <!-- Main Title -->
        <v-card-title class="main-title">Processed Documents Logs</v-card-title>
        
        <v-card-text>
          <v-window v-model="activeSection">
            <!-- Download Activity Details -->
            <v-window-item value="downloadActivity">
              <v-subheader class="subtitle custom-left-align">Processed Activity Details</v-subheader>
              <v-data-table :headers="headers" :items="logs" item-key="timestamp">
                <!-- eslint-disable-next-line vue/valid-v-slot -->
                <template v-slot:item.timestamp="{ item }">
                  {{ new Date(item.timestamp).toLocaleString() }}
                </template>
              </v-data-table>
            </v-window-item>
  
            <!-- Downloads per Username -->
            <v-window-item value="downloadsPerUsername">
              <v-subheader class="subtitle custom-left-align">Document Processed per Username</v-subheader>
              <apexchart type="bar" :options="barChartOptions" :series="barChartSeries"></apexchart>
            </v-window-item>
  
            <!-- Downloads per Day -->
            <v-window-item value="downloadsPerDay">
              <v-subheader class="subtitle custom-left-align">Document Processed per Day</v-subheader>
              <apexchart type="bar" :options="dailyDownloadsOptions" :series="dailyDownloadsSeries"></apexchart>
            </v-window-item>
          </v-window>
  
          <!-- Navigation Buttons -->
          <v-btn @click="activeSection = 'downloadActivity'">Download Activity Details</v-btn>
          <v-btn @click="activeSection = 'downloadsPerUsername'">Document Processed per Username</v-btn>
          <v-btn @click="activeSection = 'downloadsPerDay'">Document Processed per Day</v-btn>
        </v-card-text>
      </v-card>
    </v-container>
  </template>
  
  <script>
  import { mapState } from 'vuex';
  import VueApexCharts from 'vue3-apexcharts';
  
  export default {
    components: {
      apexchart: VueApexCharts
    },
    computed: {
      ...mapState({
        username: state => state.user.username // Map username from Vuex store
      })
    },
    data() {
      return {
        activeSection: 'downloadActivity',
        headers: [
          { text: 'Username', value: 'username' },
          { text: 'Timestamp', value: 'timestamp' },
        ],
        logs: [],
        barChartSeries: [],
        barChartOptions: {
          chart: {
            id: 'bar-chart',
          },
          xaxis: {
            categories: [],
          },
          title: {
            text: 'Downloads per Username'
          },
          colors: [] // Initialize colors for the user chart
        },
        dailyDownloadsSeries: [], 
        dailyDownloadsOptions: {  
          chart: {
            id: 'daily-bar-chart',
          },
          xaxis: {
            categories: [],
          },
          title: {
            text: 'Downloads Per Day'
          },
          colors: [] // Initialize colors for the daily chart
        }
      };
    },
    methods: {
      stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
          const value = (hash >> (i * 8)) & 0xFF;
          color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
      }
    },
    async created() {
  try {
    const apiUrl = process.env.VUE_APP_API_URL || '/api';
    const response = await fetch(`${apiUrl}/button-click-logs`);

    // Check if the response is okay
    if (!response.ok) {
      console.error('Error fetching logs: ', response.statusText);
      return;
    }

    const data = await response.json();

    // Check if data is empty or not what we expect
    if (!data || !Array.isArray(data)) {
      console.error('Invalid data format or empty data:', data);
      return;
    }

    // Filter out logs with null usernames
    this.logs = data.filter(log => log.username !== null);

    const usernameFrequency = {};
    const usernameColors = {};
    this.logs.forEach(log => {
      const username = log.username;
      usernameFrequency[username] = (usernameFrequency[username] || 0) + 1;
      if (!usernameColors[username]) {
        usernameColors[username] = this.stringToColor(username);
      }
    });

    this.barChartSeries = [{
      name: 'Downloads',
      data: Object.values(usernameFrequency)
    }];
    const usernames = Object.keys(usernameFrequency);
    this.barChartOptions = {
      chart: {
        id: 'bar-chart',
      },
      xaxis: {
        type: 'category',
        categories: usernames,
      },
      title: {
        text: 'Downloads per User'
      },
      plotOptions: {
        bar: {
          distributed: true
        }
      },
      colors: usernames.map(username => usernameColors[username])
    };

    const downloadsPerDay = {};
    const dateColors = {};
    this.logs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      downloadsPerDay[date] = (downloadsPerDay[date] || 0) + 1;
      if (!dateColors[date]) {
        dateColors[date] = this.stringToColor(date);
      }
    });

    this.dailyDownloadsSeries = [{
      name: 'Downloads',
      data: Object.values(downloadsPerDay)
    }];
    const dates = Object.keys(downloadsPerDay);
    this.dailyDownloadsOptions = {
      chart: {
        id: 'daily-bar-chart',
      },
      xaxis: {
        type: 'category',
        categories: dates,
      },
      title: {
        text: 'Downloads Per Day'
      },
      plotOptions: {
        bar: {
          distributed: true
        }
      },
      colors: dates.map(date => dateColors[date])
    };

  } catch (error) {
    console.error('Error fetching logs:', error);
  }
},

  };
  </script>
  
  <style scoped>
  .main-title {
    font-weight: bold;
  }
  
  .subtitle {
    font-weight: bold;
  }
  
  .custom-left-align {
    text-align: left !important;
  }
  </style>
  