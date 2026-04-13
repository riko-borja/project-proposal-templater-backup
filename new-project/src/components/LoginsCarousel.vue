<template>
    <v-card class="carousel-card">
      <v-carousel
        show-arrows
        hide-delimiters
        cycle
        height="500"
      >
        <!-- Logins Per Day Slide -->
        <v-carousel-item>
          <logins-per-day
            :data="loginsPerDayData"
            :categories="loginsPerDayCategories"
          />
        </v-carousel-item>
  
        <!-- Logins Per Week Slide -->
        <v-carousel-item>
          <logins-per-week
            :data="loginsPerDayData"
            :categories="loginsPerDayCategories"
          />
        </v-carousel-item>
  
        <!-- Logins Per Month Slide -->
        <v-carousel-item>
          <logins-per-month
            :data="loginsPerDayData"
            :categories="loginsPerDayCategories"
          />
        </v-carousel-item>
      </v-carousel>
    </v-card>
  </template>
  
  <script>
  import axios from 'axios';
  import LoginsPerDay from './LoginsPerDay.vue';
  import LoginsPerWeek from './LoginsPerWeek.vue';
  import LoginsPerMonth from './LoginsPerMonth.vue';
  
  export default {
    components: {
      LoginsPerDay,
      LoginsPerWeek,
      LoginsPerMonth
    },
    data() {
      return {
        loginsPerDayData: [],
        loginsPerDayCategories: []
      };
    },
    methods: {
      async fetchLogs() {
        try {
          const response = await axios.get('/api/logs');
          const logsData = response.data;
  
          this.processLoginsPerDay(logsData);
        } catch (error) {
          console.error('Error fetching logs:', error);
        }
      },
      processLoginsPerDay(data) {
        const dailyFrequency = data.reduce((acc, log) => {
          const date = new Date(log.loginTime).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});
  
        this.loginsPerDayCategories = Object.keys(dailyFrequency);
        this.loginsPerDayData = Object.values(dailyFrequency);
      }
    },
    created() {
      this.fetchLogs();
    }
  };
  </script>
  
  <style scoped>
  .carousel-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
  
  .v-carousel__controls {
    display: none; /* Hide default controls */
  }
  </style>
  