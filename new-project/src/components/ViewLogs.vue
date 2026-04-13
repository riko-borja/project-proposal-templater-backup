<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" md="10">
        <v-card outlined elevated>
          <v-card-title class="main-title">Login Logs</v-card-title>

          <!-- Section Navigation Buttons -->
          <div>
  <v-btn @click="activeSection = 'logActivity'">Log Activity Details</v-btn>
  <v-btn @click="activeSection = 'loginsPerUsername'">Logins per Username</v-btn>
  <v-btn @click="activeSection = 'loginsPerDay'">Logins per Day</v-btn>
</div>


          <!-- Active Section Display -->
          <v-card-text>
            <v-window v-model="activeSection">
              <!-- Log Activity Table -->
              <v-window-item value="logActivity">
                <v-data-table :headers="headers" :items="formattedLogs" class="elevation-1" />
              </v-window-item>

              <!-- Logins per Username Table -->
              <v-window-item value="loginsPerUsername">
                <v-subheader class="subtitle custom-left-align">Logins per Username</v-subheader>
                <v-data-table 
                  :headers="usernameHeaders" 
                  :items="usernameTableData" 
                  class="elevation-1"
                  v-if="usernameTableData.length"
                />
                <v-alert v-else type="info">No data available for Logins per Username</v-alert>
              </v-window-item>

              <!-- Logins per Day Table -->
              <v-window-item value="loginsPerDay">
                <v-subheader class="subtitle custom-left-align">Logins per Day</v-subheader>
                <v-data-table 
                  :headers="dailyHeaders" 
                  :items="dailyTableData" 
                  class="elevation-1"
                  v-if="dailyTableData.length"
                />
                <v-alert v-else type="info">No data available for Logins per Day</v-alert>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      activeSection: 'logActivity',
      logs: [],
      headers: [
        { text: 'Username', value: 'username' },
        { text: 'Date and Time (Dubai)', value: 'loginTimeReadable' }
      ],
      usernameHeaders: [
        { text: 'Username', value: 'username' },
        { text: 'Total Logins', value: 'totalLogins' }
      ],
      dailyHeaders: [
        { text: 'Date', value: 'date' },
        { text: 'Total Logins', value: 'totalLogins' }
      ],
      formattedLogs: [],
      usernameTableData: [],
      dailyTableData: []
    };
  },
  methods: {
    async fetchLogs() {
      console.log('Fetching logs from backend...');
      try {
        const response = await axios.get('/api/logs');
        this.logs = response.data;

        console.log('Logs received:', this.logs);

        // Format log data for Log Activity table
        this.formattedLogs = this.logs.map(log => ({
          ...log,
          loginTimeReadable: this.formatDubaiTime(log.loginTime)
        }));

        // Prepare data for Logins per Username table
        this.prepareUsernameTableData();

        // Prepare data for Logins per Day table
        this.prepareDailyTableData();
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    },
    formatDubaiTime(loginTime) {
      const dubaiOffset = 4; // Dubai is UTC+4
      const loginDate = new Date(loginTime);
      loginDate.setHours(loginDate.getHours() + dubaiOffset);
      return loginDate.toLocaleString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    },
    prepareUsernameTableData() {
      console.log('Preparing data for Logins per Username...');
      const usernameFrequency = this.calculateFrequency(this.logs, 'username');
      this.usernameTableData = Object.entries(usernameFrequency).map(([username, totalLogins]) => ({
        username,
        totalLogins
      }));

      console.log('Username table data:', this.usernameTableData);
    },
    prepareDailyTableData() {
      console.log('Preparing data for Logins per Day...');
      const dailyFrequency = this.calculateFrequency(this.logs, 'loginTime', 'date');
      this.dailyTableData = Object.entries(dailyFrequency).map(([date, totalLogins]) => ({
        date,
        totalLogins
      }));

      console.log('Daily table data:', this.dailyTableData);
    },
    calculateFrequency(logs, field, mode = 'value') {
      console.log(`Calculating frequency for field: ${field}, mode: ${mode}`);
      const frequency = {};
      logs.forEach(log => {
        let key = log[field];
        if (mode === 'date') {
          key = new Date(log.loginTime).toISOString().split('T')[0]; // Extract the date part
        }
        frequency[key] = (frequency[key] || 0) + 1;
      });
      console.log('Frequency calculated:', frequency);
      return frequency;
    },
          onSectionChange(newSection) {
        console.log(`Active section changed to: ${newSection}`);
        this.activeSection = newSection;

        if (newSection === 'loginsPerUsername') {
          this.prepareUsernameTableData();
        } else if (newSection === 'loginsPerDay') {
          this.prepareDailyTableData();
        }
      }
  },
  watch: {
    activeSection(newSection) {
      console.log(`Active section changed to: ${newSection}`);

      // Additional logic if needed
      if (newSection === 'loginsPerUsername') {
        console.log('Displaying Logins per Username table');
        console.log('Username table data:', this.usernameTableData);
      } else if (newSection === 'loginsPerDay') {
        console.log('Displaying Logins per Day table');
        console.log('Daily table data:', this.dailyTableData);
      } else if (newSection === 'logActivity') {
        console.log('Displaying Log Activity Details');
      }
    }
    },

  mounted() {
    console.log('Mounted ViewLogs.vue');
    this.fetchLogs();
  }
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
